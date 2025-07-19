// src/Pages/AssignGeoLocation.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  clients as mockClients,
  users as mockUsers,
  managers as mockManagers,
  notificationOptions as mockNotificationOptions,
} from "../data";
import { Button } from "../components/ui/button";
import AssignmentReport from "../components/AssignmentReport";

type RoleOption = "Admin" | "Manager" | "Guard" | "Client";
type NotificationOption = "Geolocation" | "Time Clock" | "Weekly Hours" | "Scheduling";

interface AssignGeoLocationFormValues {
  clientId: number | "";
  location: string | "";
  userId: number | "";
  role: RoleOption | "";
  access: "View" | "Edit" | "";
  notifiedManagerId: number | "";
  notifications: NotificationOption[];
}

export interface AssignmentRecord {
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

const AssignGeoLocation: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AssignGeoLocationFormValues>({
    defaultValues: {
      clientId: "",
      location: "",
      userId: "",
      role: "",
      access: "",
      notifiedManagerId: "",
      notifications: [],
    },
  });

  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const selectedClientId = watch("clientId");
  const selectedRole = watch("role");
  const selectedNotifications = watch("notifications");

  const availableLocations = useMemo(() => {
    const client = mockClients.find((c) => c.id === Number(selectedClientId));
    return client ? client.locations : [];
  }, [selectedClientId]);

  const accessOptions = useMemo<("View" | "Edit")[]>(() => {
    if (!selectedRole) return [];
    return selectedRole === "Admin" || selectedRole === "Manager" ? ["Edit"] : ["View"];
  }, [selectedRole]);

  useEffect(() => {
    const current = watch("access");
    if (!selectedRole) {
      setValue("access", "");
    } else if (selectedRole === "Admin" || selectedRole === "Manager") {
      if (current !== "Edit") setValue("access", "Edit");
    } else {
      if (current !== "View") setValue("access", "View");
    }
  }, [selectedRole, setValue, watch]);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const toggleNotification = (opt: NotificationOption) => {
    const current = selectedNotifications;
    if (current.includes(opt)) {
      setValue(
        "notifications",
        current.filter((v) => v !== opt),
        { shouldValidate: true }
      );
    } else {
      setValue("notifications", [...current, opt], { shouldValidate: true });
    }
  };

  const notifLabel =
    selectedNotifications.length > 0
      ? selectedNotifications.join(", ")
      : "Select Notifications *";

  const onSubmit = (data: AssignGeoLocationFormValues) => {
    const clientId = Number(data.clientId);
    const userId = Number(data.userId);
    const notifiedManagerId = Number(data.notifiedManagerId);

    const clientRec = mockClients.find((c) => c.id === clientId);
    const userRec = mockUsers.find((u) => u.id === userId);
    const mgrRec = mockManagers.find((m) => m.id === notifiedManagerId);

    const record: AssignmentRecord = {
      id: crypto.randomUUID(),
      clientId,
      clientName: clientRec?.name ?? "",
      location: data.location || null,
      userId,
      userName: userRec?.name ?? "",
      role: (data.role || "Client") as RoleOption,
      access: data.access === "Edit" ? "Edit" : "View",
      notifiedManagerId,
      notifiedManagerName: mgrRec?.name ?? "",
      notifications: data.notifications,
      createdAt: new Date().toISOString(),
    };

    setAssignments((prev) => [...prev, record]);
    reset();
  };

  return (
    <>
      <div className="bg-white border border-gray-200 shadow-md rounded-s p-4 mb-3">
        <div className="mb-6 border-b ">
          <h1 className="text-xl font-semibold text-gray-800">Assign User Permissions</h1>
          <p className="text-gray-500 text-sm">Fill in the form below to assign permissions.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-1">
            {[
              {
                name: "clientId",
                options: mockClients.map((c) => ({ value: c.id, label: c.name })),
                error: errors.clientId?.message,
                placeholder: "Select Client *",
              },
              {
                name: "location",
                options: availableLocations.map((l) => ({ value: l, label: l })),
                error: errors.location?.message,
                placeholder: "Select Location *",
              },
              {
                name: "userId",
                options: mockUsers.map((u) => ({ value: u.id, label: u.name })),
                error: errors.userId?.message,
                placeholder: "Select User *",
              },
              {
                name: "role",
                options: ["Admin", "Manager", "Guard", "Client"].map((r) => ({ value: r, label: r })),
                error: errors.role?.message,
                placeholder: "Select Role *",
              },
              {
                name: "access",
                options: accessOptions.map((a) => ({ value: a, label: a })),
                error: errors.access?.message,
                placeholder: "Select Access *",
              },
              {
                name: "notifiedManagerId",
                options: mockManagers.map((m) => ({ value: m.id, label: m.name })),
                error: errors.notifiedManagerId?.message,
                placeholder: "User Notified *",
              },
            ].map(({ name, options, error, placeholder }) => (
              <div key={name}>
                <select
                  {...register(name as keyof AssignGeoLocationFormValues, {
                    required: `${placeholder.replace("*", "").trim()} is required`,
                  })}
                  className="w-full border rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{placeholder}</option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>
            ))}

            {/* Notifications Field */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="w-full border rounded px-1 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
              >
                {notifLabel}
              </button>
              {notifOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-48 overflow-auto">
                  {mockNotificationOptions.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center px-2 py-2 hover:bg-gray-100 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={selectedNotifications.includes(opt as NotificationOption)}
                        onChange={() => toggleNotification(opt as NotificationOption)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {errors.notifications && (
                <p className="text-red-500 text-xs mt-1">Select at least one notification</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-5">
            <Button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
              Submit
            </Button>
          </div>
        </form>
              <AssignmentReport assignments={assignments} />

      </div>

      {/* Assignment Table */}
    </>
  );
};

export default AssignGeoLocation;

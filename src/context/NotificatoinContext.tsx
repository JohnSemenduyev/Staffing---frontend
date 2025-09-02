import React, { createContext, useContext, useState, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_NOTIFICATIONS } from "../graphql/queries"; // <-- New query import
import { formatDateLocal } from "../lib/utils";

// Backend types
type NotificationShift = {
  id: number;
  startTime: string;
  date: string;
};

type RawNotification = {
  id: number;
  client: { name: string };
  address: { 
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  user: { name: string; lastName: string };
  notificationType: string;
  scheduleSessionId: number;
  message: string;
  managerId: number;
  date: string;
  time: string;
  startDate: string;
  createdAt: string;
  endDate: string;
  shift?: NotificationShift;
};

// Final frontend format
export type NotificationEntry = {
  guardFirst: { name: string };
  guardLast: { name: string };
  date: string;
  time: string;
  client: { name: string };
  address: { 
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  notificationType: string;
  message: string;
  shiftTime?: string;
};

type NotificationsContextType = {
  data: NotificationEntry[] | null;
  loading: boolean;
  error: string | null;
  fetchNotifications: (
    variables: {
      addressId?: number;
      clientId?: number;
      userId?: number;
      date?: string;
      shiftId?: number;
      notificationType?: string[]; // <-- Added this missing property
    }
  ) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Helper function to safely parse dates
export const parseDate = (dateValue: any): string => {
  if (!dateValue) return "";
  
  let date: Date;
  
  try {
    // If it's already a valid date string (ISO format)
    if (typeof dateValue === 'string' && dateValue.includes('-')) {
      date = new Date(dateValue);
    }
    // If it's a timestamp (number or numeric string)
    else if (!isNaN(Number(dateValue))) {
      const timestamp = Number(dateValue);
      
      // Check if it's a valid timestamp (reasonable range)
      if (timestamp > 0 && timestamp < 9999999999999) {
        // Handle both seconds and milliseconds timestamps
        date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
      } else {
        console.warn('Invalid timestamp:', timestamp);
        return "";
      }
    }
    // Try parsing as-is
    else {
      date = new Date(dateValue);
    }
    
    // Validate the date object
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', dateValue);
      return "";
    }
    
    return formatDateLocal(date);
  } catch (error) {
    console.error('Error parsing date:', dateValue, error);
    return "";
  }
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<NotificationEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async (variables: {
    addressId?: number;
    clientId?: number;
    userId?: number;
    date?: string;
    shiftId?: number;
    notificationType?: string[]; // <-- Make sure implementation also matches
  }) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");

      const response = await graphQLClient.request<{ notifications: RawNotification[] }>(
        GET_NOTIFICATIONS,
        variables,
        { Authorization: `Bearer ${token}` }
      );

      const rawData = response.notifications || [];
      console.log("response" , response);
      const transformed: NotificationEntry[] = rawData.map((n) => ({
        guardFirst: { name: n.user?.name || "" },
        guardLast: { name: n.user?.lastName || "" },
        date: n.date || n.createdAt || "",
        time: n.time || "-",
        client: { name: n.client?.name || "" },
        address: { 
          address: n.address?.address || "", 
          city: n.address?.city || "", 
          state: n.address?.state || "", 
          pincode: n.address?.pincode || "" 
        },
        notificationType: n.notificationType,
        message: n.message,
        shiftTime: n.shift?.startTime || undefined,
      }));

      setData(transformed);
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError("Failed to fetch notifications.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <NotificationsContext.Provider value={{ data, loading, error, fetchNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
};
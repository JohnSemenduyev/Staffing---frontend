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
  subcategory?: string;
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
  subcategory?: string;
};

type NotificationsContextType = {
  data: NotificationEntry[] | null;
  loading: boolean;
  error: string | null;
  lastPage: number | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  fetchNotifications: (
    variables: {
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      addressId?: number;
      clientId?: number;
      userId?: number;
      shiftId?: number;
      notificationType?: string[];
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
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchNotifications = async (variables: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    addressId?: number;
    clientId?: number;
    userId?: number;
    shiftId?: number;
    notificationType?: string[];
    subcategory: string[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("token");

      const clean = (v: any) => {
        const out: any = {};
        if (v.startDate) out.startDate = v.startDate;
        if (v.endDate) out.endDate = v.endDate;
        if (v.page) out.page = v.page;
        if (v.limit) out.limit = v.limit;
        if (v.clientId) out.clientId = v.clientId;
        if (v.addressId) out.addressId = v.addressId;
        if (v.userId && v.userId > 0) out.userId = v.userId;
        if (v.shiftId) out.shiftId = v.shiftId;
        if (Array.isArray(v.notificationType) && v.notificationType.length > 0) {
          out.notificationType = v.notificationType;
        }
        if (Array.isArray(v.subcategory) && v.subcategory.length > 0) {
          out.subcategory = v.subcategory;
        }
        return out;
      };

      const response = await graphQLClient.request<{ 
        notifications: { 
          lastPage: number; 
          data: RawNotification[] 
        } 
      }>(
        GET_NOTIFICATIONS,
        clean(variables),
        { Authorization: `Bearer ${token}` }
      );

      const paginatedData = response.notifications;
      const rawData = paginatedData?.data || [];
      
      console.log("response", response);
      
      setLastPage(paginatedData?.lastPage || null);
      
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
        subcategory: n.subcategory,
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
    <NotificationsContext.Provider value={{ 
      data, 
      loading, 
      error, 
      lastPage, 
      currentPage, 
      setCurrentPage, 
      fetchNotifications 
    }}>
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
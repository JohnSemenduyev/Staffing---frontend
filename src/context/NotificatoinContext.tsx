import React, { createContext, useContext, useState, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { 
  GET_NOTIFICATIONS
} from "../graphql/queries";

// Types
type Address = { address: string };
type Client = { name: string };
type User = { name: string; lastName: string };

export type Notification = {
  address: Address;
  client: Client;
  user: User;
  startDate: string;
  endDate: string;
};

type NotificationsQueryResponse = {
  notifications: Notification[];
};

type NotificationContextType = {
  notifications: Notification[] | null;
  loading: boolean;
  error: string | null;
  fetchNotifications: (filters?: {
    clientId?: number;
    addressId?: number;
    userId?: number;
    date?: string;
  }) => Promise<void>;
  clearNotifications: () => void;
};

// Context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async (filters?: {
    clientId?: number;
    addressId?: number;
    userId?: number;
    date?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found.");
        setLoading(false);
        return;
      }

      const response = await graphQLClient.request<NotificationsQueryResponse>(
        GET_NOTIFICATIONS,
        filters || {},
        { Authorization: `Bearer ${token}` }
      );

      setNotifications(response.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Error fetching notifications.");
      setNotifications(null);
    } finally {
      setLoading(false);
    }
  };

  const clearNotifications = () => {
    setNotifications(null);
    setError(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        error,
        fetchNotifications,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

// src/context/UserContext.tsx
import React, { createContext, useContext, useState } from "react";
import { graphQLClient } from "../GraphqlClient";
import {
  GET_ADMIN_USERS,
  GET_MANAGER_USERS,
  GET_GUARD_USERS,
} from "../graphql/queries";

export type User = {
  id: number;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  status: boolean
  role: "admin" | "manager" | "guard";
};

interface UserContextType {
  users: User[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  lastPage: number;
  currentFilter: Record<string, any> | null;
  fetchUsersByRole: (role: "admin" | "manager" | "guard", page?: number, filter?: Record<string, any>) => Promise<void>;
  setCurrentPage: (page: number) => void;
}


const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [currentFilter, setCurrentFilter] = useState<Record<string, any> | null>(null);

  const fetchUsersByRole = async (role: "admin" | "manager" | "guard", page: number = 1, filter?: Record<string, any>) => {
    setLoading(true);
    try {
      let data;
      const variables: any = { page };
      
      // Add filter variables if provided
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            variables[key] = value;
          }
        });
      }

      if (role === "admin") {
        data = await graphQLClient.request<{ adminUsers: { data: User[]; lastPage: number } }>(GET_ADMIN_USERS, variables);
        setUsers(data.adminUsers.data);
        setLastPage(data.adminUsers.lastPage);
      } else if (role === "manager") {
        data = await graphQLClient.request<{ managerUsers: { data: User[]; lastPage: number } }>(GET_MANAGER_USERS, variables);
        setUsers(data.managerUsers.data);
        setLastPage(data.managerUsers.lastPage);
      } else if (role === "guard") {
        data = await graphQLClient.request<{ guardUsers: { data: User[]; lastPage: number } }>(GET_GUARD_USERS, variables);
        setUsers(data.guardUsers.data);
        setLastPage(data.guardUsers.lastPage);
      }
      
      setCurrentFilter(filter || null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ 
      users, 
      loading, 
      error, 
      currentPage,
      lastPage,
      currentFilter,
      fetchUsersByRole,
      setCurrentPage
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUsers must be used within a UserProvider");
  }
  return context;
};

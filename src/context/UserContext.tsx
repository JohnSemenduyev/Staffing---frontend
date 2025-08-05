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
  fetchUsersByRole: (role: "admin" | "manager" | "guard") => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsersByRole = async (role: "admin" | "manager" | "guard") => {
    setLoading(true);
    try {
      let data;
      if (role === "admin") {
        data = await graphQLClient.request<{ adminUsers: User[] }>(GET_ADMIN_USERS);
        setUsers(data.adminUsers);
      } else if (role === "manager") {
        data = await graphQLClient.request<{ managerUsers: User[] }>(GET_MANAGER_USERS);
        setUsers(data.managerUsers);
      } else if (role === "guard") {
        data = await graphQLClient.request<{ guardUsers: User[] }>(GET_GUARD_USERS);
        setUsers(data.guardUsers);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ users, loading, error, fetchUsersByRole }}>
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

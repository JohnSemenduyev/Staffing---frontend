// src/context/ClientContext.tsx
import React, { createContext, useContext, useState } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_CLIENTS } from "../graphql/queries";

// Types
export type Address = {
  id: number;
  label?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export type Client = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  addresses: Address[];
};

interface ClientContextType {
  clients: Client[];
  currentPage: number;
  lastPage: number;
  loading: boolean;
  error: string | null;
  fetchClients: (page?: number) => Promise<void>;
  setCurrentPage: (page: number) => void;
}

// Context
const ClientContext = createContext<ClientContextType | undefined>(undefined);

// Provider
export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async (page = 1) => {
    setLoading(true);
    try {
      const data = await graphQLClient.request<{
        clients: { data: Client[]; lastPage: number };
      }>(GET_CLIENTS, { page });

      setClients(data.clients.data);
      setLastPage(data.clients.lastPage);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientContext.Provider
      value={{
        clients,
        currentPage,
        lastPage,
        loading,
        error,
        fetchClients,
        setCurrentPage,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

// Hook
export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClients must be used within a ClientProvider");
  }
  return context;
};

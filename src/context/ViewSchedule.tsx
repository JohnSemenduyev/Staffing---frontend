import React, { createContext, useContext, useState } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_CLIENTS_WITH_SESSIONS } from "../graphql/queries";

// Type definitions
export interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  addresses: Address[];
}

interface ClientSessionContextType {
  clients: Client[];
  loading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
}

const ClientSessionContext = createContext<ClientSessionContextType | undefined>(undefined);

export const ClientSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await graphQLClient.request<{ clientsWithScheduleSessions: Client[] }>(
        GET_CLIENTS_WITH_SESSIONS
      );
      setClients(data.clientsWithScheduleSessions);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientSessionContext.Provider value={{ clients, loading, error, fetchClients }}>
      {children}
    </ClientSessionContext.Provider>
  );
};

export const useClientSessionContext = () => {
  const context = useContext(ClientSessionContext);
  if (!context) {
    throw new Error("useClientSessionContext must be used within a ClientSessionProvider");
  }
  return context;
};

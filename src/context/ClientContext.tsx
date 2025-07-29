import React, { createContext, useContext, useState } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_CLIENTS } from "../graphql/queries";

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
  loading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await graphQLClient.request<{ clients: Client[] }>(GET_CLIENTS);
      setClients(data.clients);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientContext.Provider value={{ clients, loading, error, fetchClients }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClients must be used within a ClientProvider");
  }
  return context;
};

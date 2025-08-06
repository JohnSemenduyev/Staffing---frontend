// import React, { createContext, useContext, useState } from "react";
// import { graphQLClient } from "../GraphqlClient";
// import { GET_UNIQUE_CLIENT_ADDRESS_SESSIONS } from "../graphql/queries";

// // Type definitions...
// export interface Address {
//   id: number;
//   address: string;
//   city: string;
//   state: string;
//   pincode: string;
// }

// export interface Client {
//   id: number;
//   name: string;
//   email: string;
//   phone?: string;
//   createdAt: string;
//   addresses: Address[];
// }

// export interface ScheduleSession {
//   id: number;
//   clientId: number;
//   addressId: number;
//   startDate: string;
//   endDate: string;
//   client: Client;
//   address: Address;
// }

// interface ClientSessionContextType {
//   sessions: ScheduleSession[];
//   loading: boolean;
//   error: string | null;
//   fetchSessions: () => Promise<void>;
// }

// const ClientSessionContext = createContext<ClientSessionContextType | undefined>(undefined);

// export const ClientSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [sessions, setSessions] = useState<ScheduleSession[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);

//   const fetchSessions = async () => {
//     setLoading(true);
//     try {
//       const data = await graphQLClient.request<{ scheduleSessionsWithUniqueClientAddressPair: ScheduleSession[] }>(
//         GET_UNIQUE_CLIENT_ADDRESS_SESSIONS
//       );
//       setSessions(data.scheduleSessionsWithUniqueClientAddressPair);
//       setError(null);
//     } catch (err: any) {
//       console.error(err);
//       setError(err.message || "Failed to fetch schedule sessions");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ClientSessionContext.Provider value={{ sessions, loading, error, fetchSessions }}>
//       {children}
//     </ClientSessionContext.Provider>
//   );
// };

// export const useClientSessionContext = () => {
//   const context = useContext(ClientSessionContext);
//   if (!context) {
//     throw new Error("useClientSessionContext must be used within a ClientSessionProvider");
//   }
//   return context;
// };
import React, { createContext, useContext, useState, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_UNIQUE_CLIENT_ADDRESS_SESSIONS } from "../graphql/queries";

// Types
export type Address = {
  address: string;
  city: string;
  state: string;
  pincode: string;
};

export type Client = {
  name: string;
};

export type ClientSession = {
  client: Client;
  address: Address;
};

type ClientSessionContextType = {
  clientSessions: ClientSession[] | null;
  loading: boolean;
  error: string | null;
  fetchClientSessions: () => Promise<void>;
};

// Context
const ClientSessionContext = createContext<ClientSessionContextType | undefined>(undefined);

// Provider
export const ClientSessionProvider = ({ children }: { children: ReactNode }) => {
  const [clientSessions, setClientSessions] = useState<ClientSession[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await graphQLClient.request<{ ScheduleSessionsByClientWeek: ClientSession[] }>(
        GET_UNIQUE_CLIENT_ADDRESS_SESSIONS,
        {},
        { Authorization: `Bearer ${token}` }
      );
      setClientSessions(response.ScheduleSessionsByClientWeek);
    } catch (err) {
      console.error("Failed to fetch client sessions:", err);
      setError("Error fetching client sessions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientSessionContext.Provider value={{ clientSessions, loading, error, fetchClientSessions }}>
      {children}
    </ClientSessionContext.Provider>
  );
};

// Hook
export const useClientSessions = () => {
  const context = useContext(ClientSessionContext);
  if (!context) {
    throw new Error("useClientSessions must be used within a ClientSessionProvider");
  }
  return context;
};

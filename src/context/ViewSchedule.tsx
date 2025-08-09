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
import { 
  GET_UNIQUE_CLIENT_ADDRESS_SESSIONS,
  SCHEDULE_SESSIONS_BY_CLIENT_WEEK 
} from "../graphql/queries";
import { BULK_UPSERT_SCHEDULE_SESSION } from "../graphql/mutation";
import { toast as toasted } from "sonner";

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
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  client: Client;
  address: Address;
};

export type Shift = {
  startTime: string;
  endTime: string;
  hours: number;
  actualHours: number;
  id: number;
  scheduleSessionId: number;
  date: string;
};

export type ScheduleUser = {
  id: number;
  name: string;
};

export type ScheduleDataItem = {
  shifts: Shift[];
  user: ScheduleUser;
  clientId: number;
  addressId: number;
  weeklyHours: number;
};

export type ScheduleData = ScheduleDataItem[];

// New input type for mutation
export type ShiftInput = {
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
};

export type ScheduleSessionInputExtended = {
  scheduleSessionId?: number | null;
  clientId: number | null;
  addressId: number | null;
  userId: number | null;
  startDate: string | null;
  endDate: string | null;
  auto: boolean | null;
  weeklyHours: number | null;
  shifts: ShiftInput[];
};

// Context type
type ClientSessionContextType = {
  clientSessions: ClientSession[] | null;
  loading: boolean;
  error: string | null;
  fetchClientSessions: () => Promise<void>;

  scheduleData: ScheduleData | null;
  scheduleLoading: boolean;
  scheduleError: string | null;
  fetchScheduleData: (clientId: number, addressId: number, date: string) => Promise<void>;
  clearScheduleData: () => void;

  bulkUpsertScheduleSessions: (input: ScheduleSessionInputExtended[]) => Promise<void>;
  mutationLoading: boolean;
};

const ClientSessionContext = createContext<ClientSessionContextType | undefined>(undefined);

export const ClientSessionProvider = ({ children }: { children: ReactNode }) => {
  const [clientSessions, setClientSessions] = useState<ClientSession[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [mutationLoading, setMutationLoading] = useState<boolean>(false);

  const fetchClientSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await graphQLClient.request<{
        ScheduleSessionsByClientWeekForManager: ClientSession[];
      }>(
        GET_UNIQUE_CLIENT_ADDRESS_SESSIONS,
        {},
        { Authorization: `Bearer ${token}` }
      );
      setClientSessions(response.ScheduleSessionsByClientWeekForManager);
    } catch (err) {
      console.error("Failed to fetch client sessions:", err);
      setError("Error fetching client sessions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleData = async (clientId: number, addressId: number, date: string) => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await graphQLClient.request<{
        ScheduleSessionsByClientWeek: ScheduleData;
      }>(
        SCHEDULE_SESSIONS_BY_CLIENT_WEEK,
        { clientId, addressId, date },
        { Authorization: `Bearer ${token}` }
      );
      setScheduleData(response.ScheduleSessionsByClientWeek);
    } catch (err) {
      console.error("Failed to fetch schedule data:", err);
      setScheduleError("Error fetching schedule data.");
      setScheduleData(null);
    } finally {
      setScheduleLoading(false);
    }
  };

  const clearScheduleData = () => {
    setScheduleData(null);
    setScheduleError(null);
  };

  const bulkUpsertScheduleSessions = async (input: ScheduleSessionInputExtended[]) => {
    setMutationLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await graphQLClient.request(
        BULK_UPSERT_SCHEDULE_SESSION,
        { input },
        { Authorization: `Bearer ${token}` }
      );
      toasted.success("Schedule saved successfully!");
      console.log("Bulk upsert response:", response);
    } catch (err) {
      console.error("Failed to save schedule sessions:", err);
      toasted.error("Failed to save schedule.");
    } finally {
      setMutationLoading(false);
    }
  };

  return (
    <ClientSessionContext.Provider
      value={{
        clientSessions,
        loading,
        error,
        fetchClientSessions,
        scheduleData,
        scheduleLoading,
        scheduleError,
        fetchScheduleData,
        clearScheduleData,
        bulkUpsertScheduleSessions,
        mutationLoading
      }}
    >
      {children}
    </ClientSessionContext.Provider>
  );
};

export const useClientSessions = () => {
  const context = useContext(ClientSessionContext);
  if (!context) {
    throw new Error("useClientSessions must be used within a ClientSessionProvider");
  }
  return context;
};


import React, { createContext, useContext, useState, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { 
  GET_UNIQUE_CLIENT_ADDRESS_SESSIONS,
  SCHEDULE_SESSIONS_BY_CLIENT_WEEK,
  GET_ALL_SESSIONS,
} from "../graphql/queries";
import { BULK_UPSERT_SCHEDULE_SESSION, UPDATE_MANY_SESSION_TIMES } from "../graphql/mutation";
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

export type User = {
  id: number;
  name: string;
  phone?: string;
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

export type SessionItem = {
  id: number;
  shiftId?: number;
  scheduleSessionId: number;
  clockIn: string;
  clockOut: string;
  workedTime: number;
  clockInLat?: number;
  clockInLong?: number;
  clockOutLat?: number;
  clockOutLong?: number;
  shift?: Shift;
  scheduleSession?: ScheduleSession;
};

export type ScheduleSession = {
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  startDate: string;
  endDate?: string;
  auto: boolean;
  createdAt?: string;
  client?: Client;
  address?: Address;
  weeklyHours?: number;
  user?: User;
  shifts?: Shift[];
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
  shiftId?: number;
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

  // Session data for actual time tracking
  sessionData: SessionItem[] | null;
  sessionLoading: boolean;
  sessionError: string | null;
  fetchSessionData: (scheduleSessionIds: number[]) => Promise<void>;
  clearSessionData: () => void;
  updateSessionTimes: (sessionUpdates: Array<{
    sessionId?: number | null;
    shiftId: number;
    scheduleSessionId: number;
    clockIn: string;
    clockOut: string;
  }>) => Promise<SessionItem[]>;
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

  // Session data state
  const [sessionData, setSessionData] = useState<SessionItem[] | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

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

  const fetchSessionData = async (scheduleSessionIds: number[]) => {
    setSessionLoading(true);
    setSessionError(null);
    try {
      const token = localStorage.getItem("token");
      
      // Use GET_ALL_SESSIONS to fetch all sessions at once
      const response = await graphQLClient.request<{
        sessions: SessionItem[];
      }>(
        GET_ALL_SESSIONS,
        {},
        { Authorization: `Bearer ${token}` }
      );

      // Filter sessions to only include those with matching scheduleSessionIds
      const filteredSessions = response.sessions.filter(session => 
        scheduleSessionIds.includes(session.scheduleSessionId)
      );

      setSessionData(filteredSessions);
    } catch (err) {
      console.error("Failed to fetch session data:", err);
      setSessionError("Error fetching session data.");
      setSessionData(null);
    } finally {
      setSessionLoading(false);
    }
  };

  const clearSessionData = () => {
    setSessionData(null);
    setSessionError(null);
  };

  // Update or create session times
  const updateSessionTimes = async (sessionUpdates: Array<{
    sessionId?: number | null;
    shiftId: number;
    scheduleSessionId: number;
    clockIn: string;
    clockOut: string;
  }>) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await graphQLClient.request<{
        updateManySessionTimes: SessionItem[];
      }>(
        UPDATE_MANY_SESSION_TIMES,
        { items: sessionUpdates },
        { Authorization: `Bearer ${token}` }
      );

      console.log("Session times updated:", response.updateManySessionTimes);
      toasted.success("Session times updated successfully!");
      
      // Refresh session data after update
      if (scheduleData) {
        // Collect unique scheduleSessionIds from shifts within scheduleData
        const scheduleSessionIds = new Set<number>();
        scheduleData.forEach(item => {
          item.shifts.forEach(shift => {
            if (shift.scheduleSessionId) {
              scheduleSessionIds.add(shift.scheduleSessionId);
            }
          });
        });
        await fetchSessionData(Array.from(scheduleSessionIds));
      }
      
      return response.updateManySessionTimes;
    } catch (error) {
      console.error("Error updating session times:", error);
      toasted.error("Failed to update session times");
      throw error;
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
        mutationLoading,
        sessionData,
        sessionLoading,
        sessionError,
        fetchSessionData,
        clearSessionData,
        updateSessionTimes
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

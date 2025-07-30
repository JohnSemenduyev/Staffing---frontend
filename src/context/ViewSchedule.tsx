// context/ScheduleContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { graphQLClient } from "../GraphqlClient";
import { GET_SCHEDULE_SESSIONS } from '../graphql/queries';

interface Shift {
  id: number;
  scheduleSessionId: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
}

interface ScheduleSession {
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  startDate: string;
  auto: boolean;
  createdAt: string;
  client: { id: number; name: string };
  address: { id: number; address: string };
  user: { id: number; name: string };
  shifts: Shift[];
}

interface ScheduleContextProps {
  sessions: ScheduleSession[];
  lastPage: number;
  fetchSessions: (page?: number, startDate?: string) => void;
  loading: boolean;
}

// Renamed context
const ScheduleContext = createContext<ScheduleContextProps | undefined>(undefined);

// Renamed provider
export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSessions = async (page = 1, startDate?: string) => {
    setLoading(true);
    try {
      const data: { scheduleSessions: { data: ScheduleSession[]; lastPage: number } } =
        await graphQLClient.request(GET_SCHEDULE_SESSIONS, { page, startDate });
        console.log("Fetched sessions:", data.scheduleSessions.data);
      setSessions(data.scheduleSessions.data);
      setLastPage(data.scheduleSessions.lastPage);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <ScheduleContext.Provider value={{ sessions, lastPage, fetchSessions, loading }}>
      {children}
    </ScheduleContext.Provider>
  );
};

// Renamed hook
export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
};

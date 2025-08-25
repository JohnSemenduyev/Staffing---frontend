import React, { createContext, useContext, useState, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_SCHEDULE_SESSIONS_BY_CLIENT_WEEK } from "../graphql/queries";
import { formatDateStringLocal } from "../lib/utils";

// Types from backend
type Shift = {
  date: string;
  hours: number;
};

const formatToMMDDYYYY = (dateStr: string): string => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${month}-${day}-${year}`;
};

type RawScheduleSession = {
  client: {
    lastName: any; name: string 
};
  address: { address: string };
  user: { name: string; lastName: string };
  shifts: Shift[];
};

// Final frontend format
export type TimeSummaryEntry = {
  guardFirst: { name: string };
  guardLast: { name: string };
  date: string;
  Client: { name: string };
  address: { address: string };
  time: number;
};

type ViewTimeSummaryContextType = {
  data: TimeSummaryEntry[] | null;
  loading: boolean;
  error: string | null;
  fetchSummary: (clientId: number, date?: string) => Promise<void>;
};

const ViewTimeSummaryContext = createContext<ViewTimeSummaryContextType | undefined>(undefined);

export const ViewTimeSummaryProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<TimeSummaryEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (clientId: number, date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");

      const variables = { clientId, date };
      const response = await graphQLClient.request<{ ScheduleSessionsByClientWeek: RawScheduleSession[] }>(
        GET_SCHEDULE_SESSIONS_BY_CLIENT_WEEK,
        variables,
        { Authorization: `Bearer ${token}` }
      );

      const rawData = response.ScheduleSessionsByClientWeek;

      // ✅ Transform backend data into frontend format
      const transformed: TimeSummaryEntry[] = rawData.flatMap((session) =>
  session.shifts.map((shift) => {
    const formattedDate = formatDateStringLocal(shift.date);
    return {
      guardFirst: { name: session.user.name },
      guardLast: { name: session.user.lastName },
      date: formatToMMDDYYYY(formattedDate),
      Client: { name: [session.client.name, session.client.lastName].filter(Boolean).join(' ') },      address: { address: session.address.address },
      time: shift.hours,
    };
  })
);

      setData(transformed);
    } catch (err: any) {
      console.error("Error fetching summary:", err);
      setError("Failed to fetch time summary.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ViewTimeSummaryContext.Provider value={{ data, loading, error, fetchSummary }}>
      {children}
    </ViewTimeSummaryContext.Provider>
  );
};

export const useViewTimeSummary = () => {
  const context = useContext(ViewTimeSummaryContext);
  if (!context) {
    throw new Error("useViewTimeSummary must be used within ViewTimeSummaryProvider");
  }
  return context;
};

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
  address: { address: string , city: string, state: string, pincode: string};
  user: { name: string; lastName: string };
  shifts: Shift[];
};

// Final frontend format
export type TimeSummaryEntry = {
  guardFirst: { name: string };
  guardLast: { name: string };
  date: string;
  Client: { name: string , lastName: string};
  address: { address: string , city: string, state: string, pincode: string};
  time: number;
};

type ViewTimeSummaryContextType = {
  data: TimeSummaryEntry[] | null;
  loading: boolean;
  error: string | null;
  lastPage: number | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  fetchSummary: (clientId?: number, date?: string, page?: number) => Promise<void>;
};

const ViewTimeSummaryContext = createContext<ViewTimeSummaryContextType | undefined>(undefined);

export const ViewTimeSummaryProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<TimeSummaryEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchSummary = async (clientId?: number, date?: string, page?: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");

      const variables: any = { date, page };
      if (clientId) variables.clientId = clientId;
      const response = await graphQLClient.request<{ 
        ScheduleSessionsByClientWeek: {
          lastPage: number;
          data: RawScheduleSession[];
        };
      }>(
        GET_SCHEDULE_SESSIONS_BY_CLIENT_WEEK,
        variables,
        { Authorization: `Bearer ${token}` }
      );

      const paginatedData = response.ScheduleSessionsByClientWeek;
      const rawData = paginatedData.data;
      setLastPage(paginatedData.lastPage);
   const transformed: TimeSummaryEntry[] = rawData.flatMap((session) =>
  session.shifts.map((shift) => {
    const formattedDate = formatDateStringLocal(shift.date);
    return {
      guardFirst: { name: session.user.name },
      guardLast: { name: session.user.lastName },
      date: formatToMMDDYYYY(formattedDate),
      Client: {
        name: session.client?.name ?? "",
        lastName: session.client?.lastName ?? "",
      },
      address: {
        address: session.address?.address ?? "",
        city: session.address?.city ?? "",
        state: session.address?.state ?? "",
        pincode: session.address?.pincode ?? "",
      },
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
    <ViewTimeSummaryContext.Provider value={{ 
      data, 
      loading, 
      error, 
      lastPage, 
      currentPage, 
      setCurrentPage, 
      fetchSummary 
    }}>
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

import React, { createContext, useContext, useState, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { VIEW_TIME_SUMMARY } from "../graphql/queries";

export const formatToMMDDYYYY = (dateStr: string): string => {
  if (!dateStr) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  const [year, month, day] = dateStr.split("-");
  return `${month}-${day}-${year}`;
};

type ViewTimeSummaryRow = {
  guardFirstName: string;
  guardLastName: string;
  date: string;
  clientName: string;
  clientLastName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  actualHours: number;
  scheduleSessionId?: number;
};

export type TimeSummaryEntry = {
  guardFirst: { name: string };
  guardLast: { name: string };
  date: string;
  Client: { name: string; lastName: string };
  address: { address: string; city: string; state: string; pincode: string };
  time: number;
};

type ViewTimeSummaryContextType = {
  data: TimeSummaryEntry[] | null;
  loading: boolean;
  error: string | null;
  fetchSummary: (clientId?: number, addressId?: number, date?: string, endDate?: string) => Promise<void>;
};

const ViewTimeSummaryContext = createContext<ViewTimeSummaryContextType | undefined>(undefined);

export const ViewTimeSummaryProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<TimeSummaryEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (clientId?: number, addressId?: number, date?: string, endDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("token");

      const variables: Record<string, unknown> = {};
      if (clientId) variables.clientId = clientId;
      if (addressId) variables.addressId = addressId;
      if (date) variables.date = date;
      if (endDate) variables.endDate = endDate;

      const response = await graphQLClient.request<{
        viewTimeSummary: { data: ViewTimeSummaryRow[] };
      }>(VIEW_TIME_SUMMARY, variables, { Authorization: `Bearer ${token}` });

      const transformed: TimeSummaryEntry[] = (response.viewTimeSummary?.data ?? []).map(
        (row) => ({
          guardFirst: { name: row.guardFirstName ?? "" },
          guardLast: { name: row.guardLastName ?? "" },
          date: formatToMMDDYYYY(row.date),
          Client: {
            name: row.clientName ?? "",
            lastName: row.clientLastName ?? "",
          },
          address: {
            address: row.address ?? "",
            city: row.city ?? "",
            state: row.state ?? "",
            pincode: row.pincode ?? "",
          },
          time: row.actualHours ?? 0,
        }),
      );

      setData(transformed);
    } catch (err: unknown) {
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
      fetchSummary,
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

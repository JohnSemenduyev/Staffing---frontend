import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_CLIENT_HOURS_SUMMARY } from "../graphql/queries";

export type ClientSummaryRow = {
  clientId: number;
  addressId: number;
  clientName: string;
  address: string;
  contractHours: number;
  totalWeeklyHours: number;
  totalActualHours: number;
  unconfirmedHours: number;
  rejectedHours: number;
  diffContractMinusScheduled: number;
  diffScheduledMinusActual: number;
  diffContractMinusActual: number;
};

type ClientSummaryContextType = {
  data: ClientSummaryRow[];
  loading: boolean;
  error: string | null;
  fetchClientSummary: (date?: string) => Promise<void>;
};

const ViewClientSummaryContext =
  createContext<ClientSummaryContextType | undefined>(undefined);

const toApiDate = (value?: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-");
  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(Number(year)) ||
    Number.isNaN(Number(month)) ||
    Number.isNaN(Number(day))
  ) {
    return undefined;
  }
  return `${month}-${day}-${year}`;
};

export const ViewClientSummaryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [data, setData] = useState<ClientSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSummary = useCallback(
    async (date?: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = sessionStorage.getItem("token");
        const response = await graphQLClient.request<{
          ScheduleSessionsByClientWeekHoursdetails: ClientSummaryRow[];
        }>(
          GET_CLIENT_HOURS_SUMMARY,
          {
            date: toApiDate(date),
          },
          token ? { Authorization: `Bearer ${token}` } : undefined
        );

        setData(response.ScheduleSessionsByClientWeekHoursdetails || []);
      } catch (err) {
        console.error("Failed to fetch client summary", err);
        setError("Failed to load client summary.");
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return (
    <ViewClientSummaryContext.Provider
      value={{ data, loading, error, fetchClientSummary }}
    >
      {children}
    </ViewClientSummaryContext.Provider>
  );
};

export const useClientSummary = () => {
  const context = useContext(ViewClientSummaryContext);
  if (!context) {
    throw new Error(
      "useClientSummary must be used within ViewClientSummaryProvider"
    );
  }
  return context;
};


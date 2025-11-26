import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_USER_HOURS_SUMMARY } from "../graphql/queries";

export type EmployeeHoursSummary = {
  userId: string;
  userName: string;
  scheduledHours: number;
  actualHours: number;
  diffScheduledMinusActual: number;
  overTimeSchedule?: number;
  overTimeActualHours?: number;
  overTimediffScheduledMinusActual?: number;
};

type EmployeeSummaryContextType = {
  data: EmployeeHoursSummary[];
  loading: boolean;
  error: string | null;
  fetchEmployeeSummary: (date: string) => Promise<void>;
};

const ViewEmployeeSummaryContext =
  createContext<EmployeeSummaryContextType | undefined>(undefined);

const toApiDate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${month}-${day}-${year}`;
};

export const ViewEmployeeSummaryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [data, setData] = useState<EmployeeHoursSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployeeSummary = useCallback(
    async (date: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = sessionStorage.getItem("token");

        const response = await graphQLClient.request<{
          UserHoursSummary: EmployeeHoursSummary[];
        }>(
          GET_USER_HOURS_SUMMARY,
          {
            date: toApiDate(date),
          },
          token ? { Authorization: `Bearer ${token}` } : undefined
        );

        setData(response.UserHoursSummary || []);
      } catch (err) {
        console.error("Failed to fetch employee summary", err);
        setError("Failed to load employee summary.");
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return (
    <ViewEmployeeSummaryContext.Provider
      value={{ data, loading, error, fetchEmployeeSummary }}
    >
      {children}
    </ViewEmployeeSummaryContext.Provider>
  );
};

export const useEmployeeSummary = () => {
  const context = useContext(ViewEmployeeSummaryContext);
  if (!context) {
    throw new Error(
      "useEmployeeSummary must be used within ViewEmployeeSummaryProvider"
    );
  }
  return context;
};


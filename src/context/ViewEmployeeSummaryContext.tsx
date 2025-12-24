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
  userId?: string;
  userName: string;
  scheduledHours: number;
  actualHours: number;
  diffScheduledMinusActual: number;
  overTimeSchedule?: number;
  overTimeActualHours?: number;
  overTimediffScheduledMinusActual?: number;
};

export type Totals = {
  scheduledHours: number;
  actualHours: number;
  diffScheduledMinusActual: number;
  overTimeSchedule: number;
  overTimeActualHours: number;
  overTimediffScheduledMinusActual: number;
  totalUsers: number;
};

type EmployeeSummaryContextType = {
  data: EmployeeHoursSummary[];
  totals: Totals | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  lastPage: number;
  fetchEmployeeSummary: (date: string, page?: number, limit?: number, exportData?: boolean) => Promise<EmployeeHoursSummary[] | void>;
  setCurrentPage: (page: number) => void;
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
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);

  const fetchEmployeeSummary = useCallback(
    async (date: string, page: number = 1, limit: number = 10, exportData: boolean = false) => {
      // Only set loading state if not exporting (to avoid showing loader on table during export)
      if (!exportData) {
        setLoading(true);
        setError(null);
      }
      try {
        const token = sessionStorage.getItem("token");

        const response = await graphQLClient.request<{
          UserHoursSummary: {
            lastPage: number;
            data: EmployeeHoursSummary[];
            totals: Totals;
          };
        }>(
          GET_USER_HOURS_SUMMARY,
          {
            date: toApiDate(date),
            page,
            limit,
            export: exportData,
          },
          token ? { Authorization: `Bearer ${token}` } : undefined
        );

        if (exportData) {
          return response.UserHoursSummary?.data || [];
        }

        setData(response.UserHoursSummary?.data || []);
        setTotals(response.UserHoursSummary?.totals || null);
        setLastPage(response.UserHoursSummary?.lastPage || 1);
        setCurrentPage(page);
      } catch (err) {
        console.error("Failed to fetch employee summary", err);
        if (!exportData) {
          setError("Failed to load employee summary.");
          setData([]);
          setTotals(null);
          setLastPage(1);
        }
        throw err;
      } finally {
        // Only set loading to false if not exporting
        if (!exportData) {
          setLoading(false);
        }
      }
    },
    []
  );

  return (
    <ViewEmployeeSummaryContext.Provider
      value={{ 
        data,
        totals,
        loading, 
        error, 
        currentPage,
        lastPage,
        fetchEmployeeSummary,
        setCurrentPage
      }}
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


import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_TIME_SETUP } from "../graphql/queries";
import { CREATE_TIME_SETUP } from "../graphql/mutation";
import { log } from "console";

interface TimeSetup {
  id: number;
  clientId: number;
  addressId: number;
  distance: number;
  actualScheduledTime: number;
  weeklyHours: number;
  reminderTime: number;
  overlap: boolean;
  unscheduledTime: boolean;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    name: string;
  };
  address: {
    id: number;
    label: string;
  };
}

interface TimeSetupInput {
  clientId: number;
  addressId: number;
  distance?: number;
  actualScheduledTime?: number;
  weeklyHours?: number;
  reminderTime?: number;
  overlap?: boolean;
  unscheduledTime?: boolean;
}

interface TimeSetupContextType {
  timeSetups: TimeSetup[];
  currentPage: number;
  lastPage: number;
  loading: boolean;
  error: string | null;
  fetchTimeSetups: (page?: number) => void;
  setCurrentPage: (page: number) => void;
  createTimeSetup: (input: TimeSetupInput) => Promise<TimeSetup | undefined>;
}

const TimeSetupContext = createContext<TimeSetupContextType | undefined>(undefined);

export const TimeSetupProvider = ({ children }: { children: ReactNode }) => {
  const [timeSetups, setTimeSetups] = useState<TimeSetup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);

  const fetchTimeSetups = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphQLClient.request<{
        timeSetup: {
          data: TimeSetup[];
          lastPage: number;
        };
      }>(GET_TIME_SETUP, { page });

      setTimeSetups(data.timeSetup.data);
      setLastPage(data.timeSetup.lastPage);
      setCurrentPage(page);
    } catch (err: any) {
      console.error("Error fetching time setups:", err);
      setError(err.message || "Failed to fetch time setups");
    } finally {
      setLoading(false);
    }
  };

  const createTimeSetup = async (input: TimeSetupInput): Promise<TimeSetup | undefined> => {
    setLoading(true);
    setError(null);
    try {
      const variables = { ...input };
      const data = await graphQLClient.request<{ createTimeSetup: TimeSetup }>(CREATE_TIME_SETUP, variables);
      await fetchTimeSetups(currentPage); // refresh current page
      return data.createTimeSetup;
    } catch (err: any) {
      console.error("Error creating time setup:", err);
      setError(err.message || "Failed to create time setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TimeSetupContext.Provider
      value={{
        timeSetups,
        currentPage,
        lastPage,
        loading,
        error,
        fetchTimeSetups,
        setCurrentPage,
        createTimeSetup
      }}
    >
      {children}
    </TimeSetupContext.Provider>
  );
};


// ---- Custom Hook ----
export const useTimeSetupContext = () => {
  const context = useContext(TimeSetupContext);
  if (!context) {
    throw new Error("useTimeSetupContext must be used within a TimeSetupProvider");
  }
  return context;
};

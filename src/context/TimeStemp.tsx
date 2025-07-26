import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_TIME_SETUP } from "../graphql/queries";
import { CREATE_TIME_SETUP } from "../graphql/mutation";
import { log } from "console";

// ---- Type Definitions ----
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
  loading: boolean;
  error: string | null;
  createTimeSetup: (input: TimeSetupInput) => Promise<TimeSetup | undefined>;
  refreshTimeSetups: () => void;
}

// ---- Create Context ----
const TimeSetupContext = createContext<TimeSetupContextType | undefined>(undefined);

// ---- Provider Component ----
export const TimeSetupProvider = ({ children }: { children: ReactNode }) => {
  const [timeSetups, setTimeSetups] = useState<TimeSetup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeSetups = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphQLClient.request<{ timeSetup: TimeSetup[] }>(GET_TIME_SETUP);
      setTimeSetups(data.timeSetup);
      
    } catch (err: any) {
      console.error("Error fetching time setups:", err);
      setError(err.message || "Failed to fetch time setups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSetups();
  }, []);

  const refreshTimeSetups = () => {
    fetchTimeSetups();
  };

  const createTimeSetup = async (input: TimeSetupInput): Promise<TimeSetup | undefined> => {
    setLoading(true);
    setError(null);
    try {
      const variables = { ...input };
      const data = await graphQLClient.request<{ createTimeSetup: TimeSetup }>(CREATE_TIME_SETUP, variables);
      // Update local state with the newly created time setup
      setTimeSetups(prev => [...prev, data.createTimeSetup]);
      return data.createTimeSetup;
    } catch (err: any) {
      console.error("Error creating time setup:", err);
      setError(err.message || "Failed to create time setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TimeSetupContext.Provider value={{ timeSetups, loading, error, createTimeSetup, refreshTimeSetups }}>
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

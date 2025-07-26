import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_TIME_SETUP } from "../graphql/queries";
import {
  CREATE_TIME_SETUP,
  DELETE_TIME_SETUP,
  UPDATE_TIME_SETUP,
} from "../graphql/mutation";

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
  deleteTimeSetup: (id: number) => Promise<void>;
  updateTimeSetup: (id: number, input: TimeSetupInput) => Promise<void>;
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
      const data = await graphQLClient.request<{ createTimeSetup: TimeSetup }>(
        CREATE_TIME_SETUP,
        input
      );
      setTimeSetups(prev => [...prev, data.createTimeSetup]);
      return data.createTimeSetup;
    } catch (err: any) {
      console.error("Error creating time setup:", err);
      setError(err.message || "Failed to create time setup");
    } finally {
      setLoading(false);
    }
  };

  const deleteTimeSetup = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphQLClient.request<{ deleteTimeSetup: TimeSetup }>(
        DELETE_TIME_SETUP,
        { id }
      );
      setTimeSetups(prev => prev.filter(ts => ts.id !== data.deleteTimeSetup.id));
    } catch (err: any) {
      console.error("Error deleting time setup:", err);
      setError(err.message || "Failed to delete time setup");
    } finally {
      setLoading(false);
    }
  };

  const updateTimeSetup = async (id: number, input: TimeSetupInput) => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphQLClient.request<{ updateTimeSetup: TimeSetup }>(
        UPDATE_TIME_SETUP,
        { id, data: input }
      );
      setTimeSetups(prev =>
        prev.map(ts => (ts.id === id ? data.updateTimeSetup : ts))
      );
    } catch (err: any) {
      console.error("Error updating time setup:", err);
      setError(err.message || "Failed to update time setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TimeSetupContext.Provider
      value={{
        timeSetups,
        loading,
        error,
        createTimeSetup,
        deleteTimeSetup,
        updateTimeSetup,
        refreshTimeSetups,
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

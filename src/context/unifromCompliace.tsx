import React, { createContext, useContext, useState } from "react";
import { graphQLClient } from "../GraphqlClient";
import { UNIFORM_COMPLIANCES_BY_SCHEDULE_FILTER } from "../graphql/queries";

// === Types ===
export interface Client {
  name: string;
  lastName: string;
  phone?: string;
}

export interface User {
  name: string;
  lastName: string;
}

export interface Address {
  address: string;
}

export interface ScheduleSession {
  client: Client;
  user: User;
  address: Address;
}

export interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
}

export interface UniformCompliance {
  scheduleSessionId: number;
  shiftId: number;
  topUniformImage: string;
  bottomUniformImage: string;
  scheduleSession: ScheduleSession;
  shift: Shift;
}

interface UniformComplianceQueryResponse {
  uniformCompliancesByScheduleFilter: UniformCompliance[];
}

interface FetchVariables {
  startDate?: string;
  endDate?: string;
  addressId?: number;
  clientId?: number;
  userId?: number;
}

interface UniformComplianceContextType {
  uniformCompliances: UniformCompliance[];
  loading: boolean;
  error: string | null;
  fetchUniformCompliances: (variables: FetchVariables) => Promise<void>;
}
// === Context Creation ===
const UniformComplianceContext = createContext<UniformComplianceContextType | undefined>(undefined);

// === Provider ===
export const UniformComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uniformCompliances, setUniformCompliances] = useState<UniformCompliance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUniformCompliances = async (variables: FetchVariables) => {
    setLoading(true);
    setError(null);
    try {
      // Get fresh token for each request
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const data: UniformComplianceQueryResponse = await graphQLClient.request(
        UNIFORM_COMPLIANCES_BY_SCHEDULE_FILTER,
        variables,{ 
          Authorization: `Bearer ${token}` // Headers
        }
      );
      setUniformCompliances(data.uniformCompliancesByScheduleFilter);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Error fetching uniform compliances");
    } finally {
      setLoading(false);
    }
  };

  return (
    <UniformComplianceContext.Provider
      value={{ uniformCompliances, loading, error, fetchUniformCompliances }}
    >
      {children}
    </UniformComplianceContext.Provider>
  );
};

// === Hook ===
export const useUniformCompliance = () => {
  const context = useContext(UniformComplianceContext);
  if (!context) {
    throw new Error("useUniformCompliance must be used within a UniformComplianceProvider");
  }
  return context;
};

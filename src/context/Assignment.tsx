import React, { createContext, useContext, useState, useEffect } from "react";
import {
  GET_ASSIGNMENTS,
  CREATE_ASSIGNMENT,
  UPDATE_ASSIGNMENT,
  DELETE_ASSIGNMENT,
} from "../graphql/mutation"; // Double-check filename; should be 'mutations' plural
import { graphQLClient } from "../GraphqlClient"; // Ensure correct path & spelling

export interface Assignment {
  id: number;
  userId: number;
  guardId: number;
  clientId: number;
  addressId: number;
  role: string;
  access: string;
  notification: string[];
  createdAt: string;
  user?: { id: number; name: string };
  guard?: { id: number; name: string };
  client?: { id: number; name: string };
  address?: { id: number; label: string };
}

interface AssignmentContextType {
  assignments: Assignment[];
  lastPage: number;
  loading: boolean;
  fetchAssignments: (page?: number) => void;
  createAssignment: (data: Omit<Assignment, "id" | "createdAt">) => Promise<void>;
  updateAssignment: (id: number, data: Omit<Assignment, "id" | "createdAt">) => Promise<void>;
  deleteAssignment: (id: number) => Promise<void>;
}

const AssignmentContext = createContext<AssignmentContextType | undefined>(undefined);

export const useAssignment = () => {
  const context = useContext(AssignmentContext);
  if (!context) {
    throw new Error("useAssignment must be used within AssignmentProvider");
  }
  return context;
};

export const AssignmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchAssignments = async (page: number = 1) => {
    setLoading(true);
    try {
      type GetAssignmentsResponse = {
        assignments: {
          data: Assignment[];
          lastPage: number;
        };
      };

      const response = await graphQLClient.request<GetAssignmentsResponse>(GET_ASSIGNMENTS, { page });
      setAssignments(response.assignments.data);
      setLastPage(response.assignments.lastPage);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (data: Omit<Assignment, "id" | "createdAt">) => {
    try {
await graphQLClient.request(CREATE_ASSIGNMENT, { ...data });
      await fetchAssignments();
    } catch (error) {
      console.error("Error creating assignment:", error);
    }
  };

  const updateAssignment = async (id: number, data: Omit<Assignment, "id" | "createdAt">) => {
    try {
      await graphQLClient.request(UPDATE_ASSIGNMENT, { id, ...data });
      await fetchAssignments();
    } catch (error) {
      console.error("Error updating assignment:", error);
    }
  };

  const deleteAssignment = async (id: number) => {
    try {
      await graphQLClient.request(DELETE_ASSIGNMENT, { id });
      await fetchAssignments();
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  return (
    <AssignmentContext.Provider
      value={{
        assignments,
        lastPage,
        loading,
        fetchAssignments,
        createAssignment,
        updateAssignment,
        deleteAssignment,
      }}
    >
      {children}
    </AssignmentContext.Provider>
  );
};

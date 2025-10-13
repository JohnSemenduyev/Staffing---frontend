import React, { createContext, useContext, useState, useEffect } from "react";
import {
  CREATE_ASSIGNMENT,
  UPDATE_ASSIGNMENT,
  DELETE_ASSIGNMENT,
} from "../graphql/mutation"; // Double-check filename; should be 'mutations' plural
import { graphQLClient } from "../GraphqlClient"; // Ensure correct path & spelling
import { GET_ASSIGNMENTS } from "../graphql/queries"; // Ensure correct path & spelling
import { useToast } from "../hooks/use-toast";
export interface Assignment {
  id: number;
  userId: number;
  guardId: number;
  clientId: number;
  addressId: number;
  role: string;
  access: string;
  notification: string[];
  notificationSubCat?: string[];
  createdAt: string;
  user?: { id: number; name: string };
  guard?: { id: number; name: string };
  client?: { id: number; name: string };
  address?: { id: number; label: string ,
    address?: string;
  };
}

interface AssignmentContextType {
  assignments: Assignment[];
  lastPage: number;
  loading: boolean;
  currentPage: number;
  setCurrentPage : (page: number) => void
  submitError: string | null;
  setSubmitError: React.Dispatch<React.SetStateAction<string | null>>;
  currentFilter: Record<string, any> | null;
  fetchAssignments: (page?: number, filter?: Record<string, any>) => Promise<void>;
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
  const [currentFilter, setCurrentFilter] = useState<Record<string, any> | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
 const [currentPage, setCurrentPage] = useState(1);
 const {toast} = useToast();
  const fetchAssignments = async (page: number = 1, filter?: Record<string, any>) => {
    setLoading(true);
    try {
      type GetAssignmentsResponse = {
        assignments: {
          data: Assignment[];
          lastPage: number;
        };
      };
      const effectiveFilter = filter !== undefined ? filter : currentFilter || undefined;
      const variables: any = { page };
      if (effectiveFilter && Object.keys(effectiveFilter).length > 0) {
        variables.filter = effectiveFilter;
      }
      const token = sessionStorage.getItem("token");
      const response = await graphQLClient.request<GetAssignmentsResponse>(GET_ASSIGNMENTS, variables, { Authorization: `Bearer ${token}` });
      setAssignments(response.assignments.data);
      setLastPage(response.assignments.lastPage);
      setCurrentFilter(effectiveFilter ?? null);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      const errorMessage = error?.response?.errors?.[0]?.message || 'Failed to create geolocation';
      toast({
      title: "ERROR",
      description:errorMessage,
      variant: "destructive",
      duration: 3000,
    });
    } finally {
      setLoading(false);
    }
  };

  
  const createAssignment = async (data: Omit<Assignment, "id" | "createdAt">) => {
    try {
      const token = sessionStorage.getItem("token");
      const rest = await graphQLClient.request(CREATE_ASSIGNMENT, { ...data }, { Authorization: `Bearer ${token}` });
      console.log(rest);
      fetchAssignments(currentPage);
      toast ({
        title: "SUCCESS",
        description: "Assignment created successfully",
        variant: "default",
        duration: 1000,
      })
    } catch (err) {
      const errorMessage =
    err?.response?.errors?.[0]?.message || 'Failed to create Assignment';
  setSubmitError(errorMessage);
  console.log("Error creating assignment:", errorMessage);
    toast({
      title: "ERROR",
      description: errorMessage,
      variant: "destructive",
      duration: 3000,
    });
    }
  };

  const updateAssignment = async (id: number, data: Omit<Assignment, "id" | "createdAt">) => {
    try {
      const token = sessionStorage.getItem("token");
      await graphQLClient.request(UPDATE_ASSIGNMENT, { id, ...data }, { Authorization: `Bearer ${token}` });
      await fetchAssignments(currentPage);
      toast ({
        title: "SUCCESS",
        description: "Assignment updated successfully",
        variant: "default",
        duration: 1000,
      })
    } catch (err) {
      console.error("Error updating assignment:", err);
      const errorMessage =
    err?.response?.errors?.[0]?.message || 'Failed to create geolocation';
  setSubmitError(errorMessage);
  toast({
      title: "ERROR",
      description: errorMessage,
      variant: "destructive",
      duration: 3000,
    });
    }
  };

  const deleteAssignment = async (id: number) => {
    try {
      const token = sessionStorage.getItem("token");
      await graphQLClient.request(DELETE_ASSIGNMENT, { id }, { Authorization: `Bearer ${token}` });
      await fetchAssignments(currentPage);
      toast ({
        title: "SUCCESS",
        description: "Assignment deleted successfully",
        variant: "default",
        duration: 1000,
      })
    } catch (error) {
      const errorMessage = error?.response?.errors?.[0]?.message || 'Failed to create geolocation';
      toast({
      title: "ERROR",
      description: errorMessage,
      variant: "destructive",
      duration: 3000,
    });
      console.error("Error deleting assignment:", error);
    }
  };


  return (
    <AssignmentContext.Provider
      value={{
        assignments,
        lastPage,
        loading,
        currentPage,
        submitError,
        currentFilter,
        setSubmitError,
        setCurrentPage,
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

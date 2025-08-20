import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { gql } from "graphql-request";
import React, { useState, useRef, useEffect, useMemo } from "react";

// -- 1. GraphQL query (paginated with filter)
const GET_ASSIGNMENTS = gql`
  query GetAssignments($page: Int, $filter: AssignmentFilter) {
    assignments(page: $page, filter: $filter) {
      data {
        id
        clientId
        client { id name lastName }
        address { id label address city }
        userId
        user { id name }
        guardId
        guard { id name }
        role
        access
        notification
        createdAt
      }
      lastPage
    }
  }
`;

// -- 2. TypeScript types for assignment object
export type Assignment = {
  id: number | string;
  clientId: number;
  client: { id: number; name: string; lastName?: string | null } | null;
  address?: {
    id?: number | null;
    label?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
  userId: number;
  user: { id: number; name: string } | null;
  guardId: number;
  guard: { id: number; name: string } | null;
  role: string;
  access: string;
  notification: string[];
  createdAt: string;
};

type AssignmentsResponse = {
  assignments: {
    data: Assignment[];
    lastPage: number;
  };
};

// -- 3. The React Query hook
export function useAssignments(page: number = 1, filter?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["assignments", page, filter],
    queryFn: async (): Promise<Assignment[]> => {
      const variables: any = { page };
      if (filter && Object.keys(filter).length > 0) variables.filter = filter;
      const result = await graphQLClient.request<AssignmentsResponse>(GET_ASSIGNMENTS, variables);
      return result.assignments.data;
    },
  });
}

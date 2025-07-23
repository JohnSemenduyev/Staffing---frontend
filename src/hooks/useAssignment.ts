import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient"; // fix to your actual path
import { gql } from "graphql-request";

// -- 1. GraphQL query
const GET_ASSIGNMENTS = gql`
  query {
    assignments {
      id
      clientId
      client { name }
      address { label address city }
      userId
      user { name }
      guardId
      guard { name }
      role
      access
      notification
      createdAt
    }
  }
`;

// -- 2. TypeScript types for assignment object
export type Assignment = {
  id: number | string;
  clientId: number;
  client: { name: string } | null;
  address?: {
    label?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
  userId: number;
  user: { name: string } | null;
  guardId: number;
  guard: { name: string } | null;
  role: string;
  access: string;
  notification: string[];
  createdAt: string;
};

type AssignmentsResponse = {
  assignments: Assignment[];
};

// -- 3. The React Query hook
export function useAssignments() {
  return useQuery({
    queryKey: ["assignments"],
    queryFn: async (): Promise<Assignment[]> => {
      const result = await graphQLClient.request<AssignmentsResponse>(GET_ASSIGNMENTS);
      return result.assignments;
    },
  });
}

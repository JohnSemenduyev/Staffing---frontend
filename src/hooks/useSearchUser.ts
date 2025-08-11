import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { SEARCH_USERS } from "../graphql/queries";
import type { User } from "../types";
import { useAuth } from "../context/LoginContext";
export function useSearchUsers(search: string) {
  const { token } = useAuth();
  return useQuery<User[]>({
    queryKey: ["searchUsers", search],
    queryFn: async () => {
      const data = await graphQLClient.request<{ searchUsers: User[] }>(
        SEARCH_USERS, 
        { search }, // Variables
        { 
          Authorization: `Bearer ${token}` // Headers
        }
      );
      return data.searchUsers;
    },
    enabled: !!search && search.length >= 2 && !!token,
  });
}
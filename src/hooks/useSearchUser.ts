import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { SEARCH_USERS } from "../graphql/queries";
import type { User } from "../types";
import { useAuth } from "../context/LoginContext";
export function useSearchUsers(search: string, clientId?: number, addressId?: number) {
  const { token } = useAuth();
  return useQuery<User[]>({
    queryKey: ["searchUsers", search, clientId, addressId],
    queryFn: async () => {
      const data = await graphQLClient.request<{ searchUsers: User[] }>(
        SEARCH_USERS, 
        { search, clientId, addressId }, // Pass clientId and addressId
        { Authorization: `Bearer ${token}` }
      );
      return data.searchUsers;
    },
    enabled: !!search && search.length >= 1 && !!token,
  });
}
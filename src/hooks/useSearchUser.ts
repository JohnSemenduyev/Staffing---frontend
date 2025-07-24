import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { SEARCH_USERS } from "../graphql/queries";
import type { User } from "../types";

export function useSearchUsers(name: string) {
  return useQuery<User[]>({
    queryKey: ["searchUsers", name],
    queryFn: async () => {
      const data = await graphQLClient.request<{ searchUsers: User[] }>(SEARCH_USERS, { name });
      return data.searchUsers;
    },
    enabled: !!name && name.length >= 2,
  });
}

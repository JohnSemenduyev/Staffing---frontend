import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { SEARCH_USERS } from "../graphql/queries";
import type { User } from "../types";

export function useSearchUsers(search: string) {
  return useQuery<User[]>({
    queryKey: ["searchUsers", search],
    queryFn: async () => {
      const data = await graphQLClient.request<{ searchUsers: User[] }>(SEARCH_USERS, { search });
      return data.searchUsers;
    },
    enabled: !!search && search.length >= 2,
  });
}


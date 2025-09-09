import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { SEARCH_GUARDS } from "../graphql/queries";
import type { Guard } from "../types";

export function useSearchGuards(search: string) {
  return useQuery<Guard[]>({
    queryKey: ["searchGuards", search],
    queryFn: async () => {
      const data = await graphQLClient.request<{ searchGuards: Guard[] }>(
        SEARCH_GUARDS,
        { name: search }
      );
      return data.searchGuards;
    },
    enabled: !!search && search.length >= 1,
  });
}

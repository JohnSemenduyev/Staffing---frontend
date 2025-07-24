import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { SEARCH_CLIENTS } from "../graphql/queries";

export const useSearchClient = (search: string) => {
  return useQuery({
    queryKey: ["searchClients", search],
    queryFn: async () => {
      const { searchClients } = await graphQLClient.request<{ searchClients: { id: string; name: string }[] }>(
        SEARCH_CLIENTS,
        { name: search }
      );
      return searchClients;
    },
    enabled: !!search, // Only fetch if search input is non-empty
  });
};

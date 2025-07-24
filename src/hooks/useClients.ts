import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { GET_CLIENTS } from "../graphql/queries";
import type { Client } from "../types";

export function useClients() {
  return useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const data = await graphQLClient.request<{ clients: Client[] }>(GET_CLIENTS);
      return data.clients;
    },
  });
}

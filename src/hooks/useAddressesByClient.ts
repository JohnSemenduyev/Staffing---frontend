import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { GET_ADDRESSES_BY_CLIENT } from "../graphql/queries";
import type { Address } from "../types";

export function useAddressesByClient(clientId: number | undefined) {
  return useQuery<Address[]>({
    queryKey: ["addressesByClient", clientId],
    queryFn: async () =>
      clientId
        ? graphQLClient.request<{ addressesByClient: Address[] }>(
            GET_ADDRESSES_BY_CLIENT,
            { clientId }
          ).then(res => res.addressesByClient)
        : [],
    enabled: !!clientId,
  });
}

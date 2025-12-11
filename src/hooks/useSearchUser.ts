import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { SEARCH_USERS } from "../graphql/queries";
import type { User } from "../types";
import { useAuth } from "../context/LoginContext";

const normalizeId = (value?: number | string) => {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

export function useSearchUsers(search: string, clientId?: number | string, addressId?: number | string) {
  const { token } = useAuth();
  const normalizedClientId = normalizeId(clientId);
  const normalizedAddressId = normalizeId(addressId);

  return useQuery<User[]>({
    queryKey: ["searchUsers", search, normalizedClientId, normalizedAddressId],
    queryFn: async () => {
      const data = await graphQLClient.request<{ searchUsers: User[] }>(
        SEARCH_USERS, 
        {
          search,
          clientId: normalizedClientId,
          addressId: normalizedAddressId,
        }, // Variables
        { 
          Authorization: `Bearer ${token}` // Headers
        }
      );
      return data.searchUsers;
    },
    enabled: !!search && search.length >= 1 && !!token,
  });
}
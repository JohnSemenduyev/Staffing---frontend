import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { GET_GUARDS } from "../graphql/queries";
import { CREATE_GUARD } from "../graphql/mutation";
import { Guard } from "../types";

export function useGuards() {
  return useQuery<Guard[]>({
    queryKey: ["guards"],
    queryFn: async () => {
      const data = await graphQLClient.request<{ guards: Guard[] }>(GET_GUARDS);
      return data.guards;
    }
  });
}

export function useCreateGuard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      name: string;
      email?: string;
      phone: string;
      address?: string;
      status: "active" | "inactive";
    }) => graphQLClient.request(CREATE_GUARD, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guards"] })
  });
}

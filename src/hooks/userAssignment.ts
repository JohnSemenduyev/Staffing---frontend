import { useMutation, useQueryClient } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { CREATE_ASSIGNMENT } from "../graphql/mutation";

// Make sure the payload matches all required variables!
export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: number;
      guardId: number;
      clientId: number;
      addressId: number;
      role: string;
      access: string;
      notification: string[];
    }) =>
      graphQLClient.request(CREATE_ASSIGNMENT, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

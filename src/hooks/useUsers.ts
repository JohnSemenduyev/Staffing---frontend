import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { GET_USERS } from "../graphql/queries";
import { CREATE_USER } from "../graphql/mutation";
import type { User, UserRole } from "../types";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const data = await graphQLClient.request<{ users: User[] }>(GET_USERS);
      return data.users;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
    }) => graphQLClient.request(CREATE_USER, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

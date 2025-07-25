import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLClient } from "../GraphqlClient";
import { gql } from 'graphql-request';

const DELETE_ASSIGNMENT_MUTATION = gql`
  mutation DeleteAssignment($id: Int!) {
    deleteAssignment(id: $id) {
      id
    }
  }
`;

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const variables = { id };
      const data: { deleteAssignment: { id: number } } =
        await graphQLClient.request(DELETE_ASSIGNMENT_MUTATION, variables);
      return data.deleteAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { graphQLClient } from "../GraphqlClient";
// import { gql } from 'graphql-request';

// const UPDATE_ASSIGNMENT_MUTATION = gql`
//   mutation UpdateAssignment(
//     $id: Int!
//     $userId: Int!
//     $guardId: Int!
//     $clientId: Int!
//     $notification: [String!]!
//     $addressId: Int!
//     $role: String!
//     $access: String!
//   ) {
//     updateAssignment(
//       id: $id
//       userId: $userId
//       guardId: $guardId
//       clientId: $clientId
//       notification: $notification
//       addressId: $addressId
//       role: $role
//       access: $access
//     ) {
//       id
//     }
//   }
// `;

// // Define the shape of the input variables
// interface UpdateAssignmentInput {
//   id: number;
//   userId: number;
//   guardId: number;
//   clientId: number;
//   notification: string[];
//   addressId: number;
//   role: string;
//   access: string;
// }

// // Define the shape of the GraphQL response
// interface UpdateAssignmentResponse {
//   updateAssignment: { id: number };
// }

// export const useUpdateAssignment = () => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (variables: UpdateAssignmentInput) => {
//       const data: UpdateAssignmentResponse = await graphQLClient.request(
//         UPDATE_ASSIGNMENT_MUTATION,
//         variables
//       );
//       return data.updateAssignment;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['assignments'] });
//     },
//   });
// };

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLClient } from "../GraphqlClient";
import { gql } from 'graphql-request';

const UPDATE_ASSIGNMENT_MUTATION = gql`
  mutation UpdateAssignment($id: Int!, $data: UpdateAssignmentInput!) {
    updateAssignment(id: $id, data: $data) {
      id
    }
  }
`;

// Define updated variable type
interface UpdateAssignmentVariables {
  id: number;
  data: {
    userId: number;
    guardId: number;
    clientId: number;
    notification: string[];
    addressId: number;
    role: string;
    access: string;
  };
}

interface UpdateAssignmentResponse {
  updateAssignment: { id: number };
}

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: UpdateAssignmentVariables) => {
      const data: UpdateAssignmentResponse = await graphQLClient.request(
        UPDATE_ASSIGNMENT_MUTATION,
        variables
      );
      return data.updateAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};
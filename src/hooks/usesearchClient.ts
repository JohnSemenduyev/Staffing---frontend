// import { useQuery } from "@tanstack/react-query";
// import { graphQLClient } from "../GraphqlClient";
// import { SEARCH_CLIENTS } from "../graphql/queries";

// type Address = {
//   id: number | string;
//   label?: string;
//   address: string;
//   city?: string;
//   state?: string;
//   pincode?: string;
// };

// type Client = {
//   id: string;
//   name: string;
//   email?: string;
//   phone?: string;
//   createdAt?: string;
//   addresses: Address[];
// };


// export const useSearchClient = (search: string) => {
//   return useQuery({
//     queryKey: ["searchClients", search],
//     queryFn: async () => {
//       const { searchClients } = await graphQLClient.request<{ searchClients: Client[] }>(
//         SEARCH_CLIENTS,
//         { search } // ✅ Correct variable name
//       );
//       return searchClients;
//     },
//     enabled: !!search && search.length >= 2,
//   });
// };
import { useQuery } from "@tanstack/react-query";
import { graphQLClient } from "../GraphqlClient";
import { SEARCH_CLIENTS } from "../graphql/queries";

type Address = {
  id: number | string;
  label?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
};

type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  addresses: Address[];
};
const token=localStorage.getItem('token');
export const useSearchClient = (search: String) => {
  return useQuery({
    queryKey: ["searchClients", search],
    queryFn: async () => {
      const { searchClients } = await graphQLClient.request<{ searchClients: Client[] }>(
        SEARCH_CLIENTS,
        { search }, // Variables
        { 
          Authorization: `Bearer ${token}` // Headers
        }
      );
      return searchClients;
    },
    enabled: !!search && search.length >= 2 && !!token,
  });
};
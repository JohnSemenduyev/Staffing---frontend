export function setGraphQLToken(token: string | null) {
	if (token) {
		graphQLClient.setHeader("Authorization", `Bearer ${token}`);
	} else {
		graphQLClient.setHeaders({});
	}
}
import { GraphQLClient } from "graphql-request";

const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || "https://staffing-backend-4nm9.onrender.com/";
export const graphQLClient = new GraphQLClient(endpoint);

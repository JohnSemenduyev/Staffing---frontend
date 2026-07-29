export function setGraphQLToken(token: string | null) {
	if (token) {
		graphQLClient.setHeader("Authorization", `Bearer ${token}`);
	} else {
		graphQLClient.setHeaders({});
	}
}
import { GraphQLClient } from "graphql-request";

const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || "http://localhost:4000/graphql";
export const graphQLClient = new GraphQLClient(endpoint);

export function setGraphQLToken(token: string | null) {
	if (token) {
		graphQLClient.setHeader("Authorization", `Bearer ${token}`);
	} else {
		graphQLClient.setHeaders({});
	}
}
// src/graphqlClient.ts
import { GraphQLClient } from "graphql-request";
export const graphQLClient = new GraphQLClient("https://staffing-backend-4nm9.onrender.com/");

// https://securitywebappbackend.onrender.com/ssss

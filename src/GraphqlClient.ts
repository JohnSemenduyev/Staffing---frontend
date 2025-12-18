export function setGraphQLToken(token: string | null) {
	if (token) {
		graphQLClient.setHeader("Authorization", `Bearer ${token}`);
	} else {
		graphQLClient.setHeaders({});
	}
}
// src/graphqlClient.ts
import { GraphQLClient } from "graphql-request";
// export const graphQLClient = new GraphQLClient("https://securitywebappbackend-fkuv.onrender.com/");
export const graphQLClient = new GraphQLClient("http://localhost:4000/");
// export const graphQLClient = new GraphQLClient("https://securitywebappbackend-v2.onrender.com/");

// https://securitywebappbackend.onrender.com/
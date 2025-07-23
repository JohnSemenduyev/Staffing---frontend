// src/graphql/queries.ts
import { gql } from "graphql-request";

export const GET_CLIENTS = gql`
  query {
    clients {
      id
      name
      email
      phone
      createdAt
    }
  }
`;

export const GET_ADDRESSES_BY_CLIENT = gql`
  query AddressesByClient($clientId: Int!) {
    addressesByClient(clientId: $clientId) {
      id
      clientId
      label
      address
      city
      state
      pincode
      createdAt
    }
  }
`;
export const GET_ASSIGNMENTS = gql`
  query {
    assignments {
      id
      userId
      guardId
      clientId
      role
      access
      notification
      createdAt
      addressId
      address {
        id
        label
        address
        city
        state
        pincode
      }
      // Add user/guard/client fields as needed
    }
  }
`;


export const GET_GUARDS = gql`
  query {
    guards {
      id
      name
      email
      phone
      address
      status
      createdAt
    }
  }
`;

// ...other queries

export const GET_USERS = gql`
  query {
    users {
      id
      name
      email
      password
      role
      createdAt
    }
  }
`;

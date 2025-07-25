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
export const SEARCH_CLIENTS = gql`
  query SearchClients($name: String!) {
    searchClients(name: $name) {
      id
      name
      addresses {
      id
        address
      } 
    }
  }
`;
// queries.ts
export const SEARCH_USERS = gql`
  query SearchUsers($name: String!) {
    searchUsers(name: $name) {
      id
      name
    }
  }
`;


export const SEARCH_GUARDS = gql`
  query searchGuards($name: String!) {
    searchGuards(name: $name) {
      id
      name
    }
  }
`;
export const UPDATE_ASSIGNMENT = gql`
  mutation UpdateAssignment($id: Int!, $data: UpdateAssignmentInput!) {
    updateAssignment(id: $id, data: $data) {
      id
      role
      access
      notification
      user { id name }
      guard { id name }
      client { id name }
      address { id label }
      createdAt
    }
  }
`;

export const GET_GEOLOCATIONS = gql`
  query {
    geoLocations {
      id
      clientId
      addressId
      distance
      time
      createdAt
      client {
        id
        name
      }
      address {
        id
        label
        address
      }
    }
  }
`;
export const GET_TIME_SETUP = gql`
  query GetTimeSetup {
    timeSetup {
      id
      clientId
      addressId
      distance
      actualScheduledTime
      weeklyHours
      reminderTime
      overlap
      unscheduledTime
      createdAt
      updatedAt
      client {
        id
        name
      }
      address {
        id
        label
      }
    }
  }
`;

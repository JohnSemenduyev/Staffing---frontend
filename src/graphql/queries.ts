
import { gql } from "graphql-request";

// ----------- CLIENT QUERIES -----------

export const GET_CLIENTS = gql`
  query GetClients($page: Int) {
    clients(page: $page) {
      data {
        id
        name
        email
        phone
        createdAt
        addresses {
          id
          address
          city
          state
          pincode
        }
      }
      lastPage
    }
  }
`;


export const SEARCH_CLIENTS = gql`
  query SearchClients($search: String!) {
    searchClients(search: $search) {
      id
      name
      addresses {
        id
        address
      }
    }
  }
`;


// ----------- ADDRESS QUERIES -----------

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

export const GET_ALL_ADDRESSES = gql`
  query GetAllAddresses($page: Int) {
    allAddresses(page: $page) {
      data {
        id
        address
        city
        state
        pincode
        label
        createdAt
        client {
          id
          name
          email
        }
      }
      lastPage
    }
  }
`;
// ----------- ASSIGNMENT QUERY -----------

export const GET_ASSIGNMENTS = gql`
  query GetAssignments($page: Int) {
    assignments(page: $page) {
      data {
        id
        userId
        guardId
        clientId
        addressId
        role
        access
        notification
        createdAt
        user {
          id
          name
        }
        guard {
          id
          name
        }
        client {
          id
          name
        }
        address {
          id
          label
          address
          city
          state
          pincode
        }
      }
      lastPage
    }
  }
`;

// ----------- GUARD QUERIES -----------

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

export const SEARCH_GUARDS = gql`
  query SearchGuards($name: String!) {
    searchGuards(name: $name) {
      id
      name
    }
  }
`;

// ----------- USER QUERIES -----------

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

export const SEARCH_USERS = gql`
  query SearchUsers($search: String!) {
    searchUsers(search: $search) {
      id
      name
    }
  }
`;

export const GET_ADMIN_USERS = gql`
  query GetAdminUsers {
    adminUsers {
      id
      name
      email
      role
    }
  }
`;

export const GET_MANAGER_USERS = gql`
  query GetManagerUsers {
    managerUsers {
      id
      name
      email
      role
    }
  }
`;

export const GET_GUARD_USERS = gql`
  query GetGuardUsers {
    guardUsers {
      id
      name
      email
      role
    }
  }
`;


// ----------- GEOLOCATION QUERY -----------

export const GET_GEOLOCATIONS = gql`
  query GeoLocations($page: Int) {
    geoLocations(page: $page) {
      data {
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
          city
        }
      }
      lastPage
    }
  }
`;

// ----------- TIME SETUP QUERY -----------

export const GET_TIME_SETUP = gql`
  query TimeSetup($page: Int) {
    timeSetup(page: $page) {
      data {
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
          address
        }
      }
      lastPage
    }
  }
`;

// ----------- POST ASSIGN QUERY -----------

export const GET_POST_ASSIGN = gql`
  query GetPostAssigns($page: Int) {
    postAssigns(page: $page) {
      data {
        id
        clientId
        addressId
        post
        createdAt
        updatedAt
        client {
          id
          name
        }
        address {
          id
          label
          address
          city
          state
          pincode
        }
      }
      lastPage
    }
  }
`;

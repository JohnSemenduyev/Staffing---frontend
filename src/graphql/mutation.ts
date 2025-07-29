// src/graphql/mutations.ts

import { gql } from "graphql-request";

// -------------------- ASSIGNMENT --------------------

export const GET_ASSIGNMENTS = gql`
  query GetAssignments($page: Int) {
    assignments(page: $page) {
      data {
        id
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
        }
        notification
        role
        access
        createdAt
      }
      lastPage
    }
  }
`;

export const CREATE_ASSIGNMENT = gql`
  mutation CreateAssignment(
    $userId: Int!,
    $guardId: Int!,
    $clientId: Int!,
    $notification: [String!]!,
    $addressId: Int!,
    $role: String!,
    $access: String!
  ) {
    createAssignment(
      userId: $userId,
      guardId: $guardId,
      clientId: $clientId,
      notification: $notification,
      addressId: $addressId,
      role: $role,
      access: $access
    ) {
      id
      userId
      guardId
      clientId
      addressId
      role
      access
      notification
      createdAt
    }
  }
`;

export const UPDATE_ASSIGNMENT = gql`
  mutation UpdateAssignment(
    $id: Int!,
    $userId: Int!,
    $guardId: Int!,
    $clientId: Int!,
    $notification: [String!]!,
    $addressId: Int!,
    $role: String!,
    $access: String!
  ) {
    updateAssignment(
      id: $id,
      userId: $userId,
      guardId: $guardId,
      clientId: $clientId,
      notification: $notification,
      addressId: $addressId,
      role: $role,
      access: $access
    ) {
      id
      userId
      guardId
      clientId
      addressId
      role
      access
      notification
      createdAt
    }
  }
`;


export const DELETE_ASSIGNMENT = gql`
  mutation DeleteAssignment($id: Int!) {
    deleteAssignment(id: $id) {
      id
    }
  }
`;

// -------------------- GUARD --------------------

export const CREATE_GUARD = gql`
  mutation CreateGuard(
    $name: String!
    $email: String
    $phone: String!
    $address: String
    $status: GuardStatus!
  ) {
    createGuard(
      name: $name
      email: $email
      phone: $phone
      address: $address
      status: $status
    ) {
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

// -------------------- USER --------------------

export const CREATE_USER = gql`
  mutation CreateUser(
    $name: String!
    $email: String!
    $password: String!
    $role: UserRole!
  ) {
    createUser(
      name: $name
      email: $email
      password: $password
      role: $role
    ) {
      id
      name
      email
      password
      role
      createdAt
    }
  }
`;

// -------------------- GEOLOCATION --------------------

export const CREATE_GEOLOCATION = gql`
  mutation CreateGeoLocation(
    $clientId: Int!
    $addressId: Int!
    $distance: Float
    $time: Float
  ) {
    createGeoLocation(
      clientId: $clientId
      addressId: $addressId
      distance: $distance
      time: $time
    ) {
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
      }
    }
  }
`;

export const DELETE_GEOLOCATION = gql`
  mutation DeleteGeoLocation($id: Int!) {
    deleteGeoLocation(id: $id) {
      id
    }
  }
`;

export const UPDATE_GEOLOCATION = gql`
  mutation UpdateGeoLocation($id: Int!, $data: GeoLocationInput!) {
    updateGeoLocation(id: $id, data: $data) {
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

// -------------------- TIME SETUP --------------------

export const CREATE_TIME_SETUP = gql`
  mutation CreateTimeSetup(
    $clientId: Int!
    $addressId: Int!
    $distance: Float
    $actualScheduledTime: Float
    $weeklyHours: Float
    $reminderTime: Float
    $overlap: Boolean
    $unscheduledTime: Boolean
  ) {
    createTimeSetup(
      clientId: $clientId
      addressId: $addressId
      distance: $distance
      actualScheduledTime: $actualScheduledTime
      weeklyHours: $weeklyHours
      reminderTime: $reminderTime
      overlap: $overlap
      unscheduledTime: $unscheduledTime
    ) {
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
    }
  }
`;

export const UPDATE_TIME_SETUP = gql`
  mutation UpdateTimeSetup($id: Int!, $data: TimeSetupInput!) {
    updateTimeSetup(id: $id, data: $data) {
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

export const DELETE_TIME_SETUP = gql`
  mutation DeleteTimeSetup($id: Int!) {
    deleteTimeSetup(id: $id) {
      id
    }
  }
`;

// -------------------- POST ASSIGN --------------------

export const CREATE_POST_ASSIGN = gql`
  mutation CreatePostAssign($clientId: Int!, $addressId: Int!, $post: String!) {
    createPostAssign(clientId: $clientId, addressId: $addressId, post: $post) {
      id
      clientId
      addressId
      post
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_POST_ASSIGN = gql`
  mutation UpdatePostAssign($id: Int!, $data: PostAssignInput!) {
    updatePostAssign(id: $id, data: $data) {
      id
      post
      updatedAt
    }
  }
`;

export const DELETE_POST_ASSIGN = gql`
  mutation DeletePostAssign($id: Int!) {
    deletePostAssign(id: $id) {
      id
    }
  }
`;

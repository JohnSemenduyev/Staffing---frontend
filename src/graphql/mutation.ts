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
export const GET_SCHEDULE_SESSIONS = `
  query GetScheduleSessions($page: Int) {
    allAddresses(page: $page) {
      data {
        contractHour
        client {
          name
          lastName
        }
        address
        industry
        city
        state
        pincode
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
export const CREATE_SCHEDULE_SESSION = gql`
  mutation CreateScheduleSession(
    $clientId: Int!
    $addressId: Int!
    $userId: Int!
    $startDate: String!
    $auto: Boolean
    $shifts: [ShiftInput!]!
  ) {
    createScheduleSession(
      clientId: $clientId
      addressId: $addressId
      userId: $userId
      startDate: $startDate
      auto: $auto
      shifts: $shifts
    ) {
      id
      clientId
      addressId
      userId
      startDate
      auto
      createdAt
      client { id name }
      address { id address }
      user { id name }
      shifts {
        id date startTime endTime hours
      }
    }
  }
`;

export const CREATE_MULTIPLE_SCHEDULE_SESSIONS = gql`
  mutation CreateScheduleSession($input: [ScheduleSessionInput!]!) {
    createScheduleSession(input: $input) {
      id
      clientId
      addressId
      userId
      startDate
      endDate
      auto
      createdAt
      client {
        name
      }
      address {
        address
      }
      user {
        name
      }
      shifts {
        date
        startTime
        endTime
      }
    }
  }
`;

export const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      token
      role
    }
  }
`;
export const BULK_UPSERT_SCHEDULE_SESSION = gql`
  mutation BulkUpsertScheduleSession($input: [ScheduleSessionInputExtended!]!) {
    bulkUpsertScheduleSession(input: $input) {
      id
    }
  }
`;

export const UPDATE_SCHEDULE_SESSION_AUTO = gql`
  mutation UpdateScheduleSessionAuto($id: Int!, $auto: Boolean!) {
    updateScheduleSessionAuto(id: $id, auto: $auto) {
      id
      auto
      updatedAt
    }
  }
`;

export const UPDATE_MANY_SESSION_TIMES = gql`
  mutation UpdateManySessionTimes($items: [UpdateOneSessionTimesInput!]!) {
    updateManySessionTimes(items: $items) {
      id
      shiftId
      scheduleSessionId
      clockIn
      clockOut
      workedTime
      clockInLat
      clockInLong
      clockOutLat
      clockOutLong
    }
  }
`;

export const CREATE_USER_ = gql`
  mutation CreateUser(
    $name: String!
    $email: String!
    $password: String!
    $role: UserRole!
    $address: String
    $zipcode: String
    $state: String
    $city: String
    $phone: String
    $lastName: String
  ) {
    createUser(
      name: $name
      email: $email
      password: $password
      role: $role
      address: $address
      zipcode: $zipcode
      state: $state
      city: $city
      phone: $phone
      lastName: $lastName
    ) {
      id
      name
      lastName
    }
  }
`;
export const CREATE_CLIENT_REGISTRATION = gql`
  mutation CreateClientRegistration($input: CreateClientRegistrationInput!) {
    createClientRegistration(input: $input) {
      id
      company
      createdAt
      email
      name
      lastName
      phone
      addresses {
        id
        label
        address
        city
        state
        pincode
        industry
      }
    }
  }
`;
export const CREATE_CLIENT_WITH_ADDRESSES = gql`
  mutation CreateClientWithAddresses($input: CreateClientWithAddressesInput!) {
    createClientWithAddresses(input: $input) {
      id
    }
  }
`;

export const CHECK_SCHEDULE_SESSION = gql`
  mutation CheckScheduleSession($clientId: Int!, $addressId: Int!, $userId: Int!, $startDate: String!) {
    checkScheduleSession(clientId: $clientId, addressId: $addressId, userId: $userId, startDate: $startDate) {
      message
      id
    }
  }
`;
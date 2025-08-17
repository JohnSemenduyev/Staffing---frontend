
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


export const SESSIONS_BY_SCHEDULE_SESSION = gql`
  query SessionsByScheduleSession($scheduleSessionId: Int!) {
    sessionsByScheduleSession(scheduleSessionId: $scheduleSessionId) {
      id
      shiftId
      scheduleSessionId
      clockIn
      clockOut
      workedTime
      shift {
        id
        date
      }
    }
  }
`;
export const SEARCH_CLIENTS = gql`
  query SearchClients($search: String!) {
    searchClients(search: $search) {
      id
      name
      lastName
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
          phone
          company
          lastName
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
      lastName
      email
      phone
      address
      city
      state
      zipcode
      role
      status
    }
  }
`;


export const GET_MANAGER_USERS = gql`
  query GetManagerUsers {
    managerUsers {
      id
      name
      lastName
      email
      phone
      address
      city
      state
      zipcode
      role
    }
  }
`;

export const GET_GUARD_USERS = gql`
  query GetGuardUsers {
    guardUsers {
      id
      name
      lastName
      email
      phone
      address
      city
      state
      zipcode
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


export const GET_SCHEDULE_SESSIONS = gql`
  query GetScheduleSessions($page: Int, $startDate: String) {
    scheduleSessions(page: $page, startDate: $startDate) {
      data {
        id
        clientId
        addressId
        userId
        startDate
        auto
        weeklyHours
        createdAt
        client {
          id
          name
        }
        address {
          id
          address
        }
        user {
          id
          name
        }
        shifts {
          id
          scheduleSessionId
          date
          startTime
          endTime
          hours
        }
      }
      lastPage
    }
  }
`;

export const GET_UNIQUE_CLIENT_ADDRESS_SESSIONS = gql`
  query GetUniqueClientAddressSessions {
    ScheduleSessionsByClientWeekForManager {
      id
      clientId
      addressId
      userId
      client {
        name
      }
      address {
        address
        city
        state
        pincode
      }
    }
  }
`;



export const UNIFORM_COMPLIANCES_BY_SCHEDULE_FILTER = gql`
  query UniformCompliancesByScheduleFilter(
    $startDate: String,
    $endDate: String,
    $addressId: Int,
    $clientId: Int,
    $userId: Int
  ) {
    uniformCompliancesByScheduleFilter(
      startDate: $startDate,
      endDate: $endDate,
      addressId: $addressId,
      clientId: $clientId,
      userId: $userId
    ) {
      shift {
        id
        date
        startTime
        endTime
      }
      scheduleSession {
        client {
          name
          lastName
        }
        user {
          name
          lastName
        }
        address {
          address
        }
      }
      bottomUniformImage
      topUniformImage
      shiftId
      scheduleSessionId
    }
  }
`;

export const GET_SCHEDULE_SESSIONS_BY_CLIENT_WEEK = gql`
  query GetScheduleSessionsByClientWeek($clientId: Int!, $date: String) {
    ScheduleSessionsByClientWeek(clientId: $clientId, date: $date) {
      client {
        name
      }
      address {
        address
      }
      user {
        name
        lastName
      }
      shifts {
        date
        hours
      }
    }
  }
`;
export const SCHEDULE_SESSIONS_BY_CLIENT_WEEK = gql`
  query ScheduleSessionsByClientWeek($clientId: Int, $addressId: Int, $date: String) {
    ScheduleSessionsByClientWeek(clientId: $clientId, addressId: $addressId, date: $date) {
      shifts {
        startTime
        endTime
        hours
        actualHours
        id
        scheduleSessionId
        date
      }
        user {
      id
      name
    }
      clientId
      addressId
      weeklyHours
    }
  }
`;

export const CHECK_CLIENT_WEEK_SCHEDULE = gql`
  query Query($clientId: Int!, $startDate: String!, $addressId: Int!) {
    checkClientWeekSchedule(clientId: $clientId, startDate: $startDate, addressId: $addressId) {
      overlap
      message
    }
  }
`;
export const GET_NOTIFICATIONS = gql`
  query Notifications(
    $addressId: Int
    $clientId: Int
    $userId: Int
    $date: String
    $shiftId: Int
  ) {
    notifications(
      addressId: $addressId
      clientId: $clientId
      userId: $userId
      date: $date
      shiftId: $shiftId
    ) {
      id
      clientId
      addressId
      userId
      notificationType
      scheduleSessionId
      message
      managerId
      startDate
      endDate
      client {
        name
      }
      address {
        address
      }
      shift {
        id
        startTime
        date
      }
        user {
      name
    }
    }
  }
`;
export const GET_ALL_SESSIONS = gql`
  query GetAllSessions {
    sessions {
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
      shift {
        id
        date
        startTime
        endTime
        hours
        actualHours
      }
      scheduleSession {
        id
        clientId
        addressId
        userId
        startDate
        endDate
        client {
          id
          name
        }
        address {
          id
          address
          city
          state
          pincode
        }
        user {
          id
          name
          lastName
          phone
        }
      }
    }
  }
`;
export const GET_SESSIONS_BY_SCHEDULE_SESSION = gql`
  query SessionsByScheduleSession($scheduleSessionId: Int!) {
    sessionsByScheduleSession(scheduleSessionId: $scheduleSessionId) {
      id
      shiftId
      scheduleSessionId
      clockIn
      clockOut
      workedTime
      shift {
        id
        date
      }
    }
  }
`;
export const GET_ALL_CLIENTS_WITH_ADDRESSES = gql`
  query GetAllClientsWithAddresses {
    getAllClientsWithAddresses {
      id
      name
      lastName
      phone
      company
      email
      addresses {
        id
        address
        city
        state
        pincode
      }
    }
  }
`;
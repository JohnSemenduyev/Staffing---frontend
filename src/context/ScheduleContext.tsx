// import React, { createContext, useContext, useState } from "react";
// import { graphQLClient } from "../GraphqlClient";
// import { CREATE_SCHEDULE_SESSION } from "../graphql/mutation";

// // Shift input type
// type ShiftInput = {
//   date: string;
//   startTime: string;
//   endTime: string;
//   hours: number;
// };

// type CreateSessionInput = {
//   clientId: number;
//   addressId: number;
//   userId: number;
//   startDate: string;
//   auto?: boolean;
//   shifts: ShiftInput[];
// };

// type ScheduleSession = {
//   id: number;
//   clientId: number;
//   addressId: number;
//   userId: number;
//   startDate: string;
//   auto: boolean;
//   createdAt: string;
//   client: { id: number; name: string };
//   address: { id: number; address: string };
//   user: { id: number; name: string };
//   shifts: (ShiftInput & { id: number })[];
// };

// type ScheduleSessionContextType = {
//   sessions: ScheduleSession[];
//   createSession: (data: CreateSessionInput) => Promise<void>;
// };

// type CreateScheduleSessionResponse = {
//   createScheduleSession: ScheduleSession;
// };

// const ScheduleSessionContext = createContext<ScheduleSessionContextType | undefined>(undefined);

// export const ScheduleSessionProvider = ({ children }: { children: React.ReactNode }) => {
//   const [sessions, setSessions] = useState<ScheduleSession[]>([]);

//   const createSession = async (data: CreateSessionInput) => {
//     try {
//       // Unpack data into individual variables
//       const response = await graphQLClient.request<CreateScheduleSessionResponse>(
//         CREATE_SCHEDULE_SESSION,
//         {
//           clientId: data.clientId,
//           addressId: data.addressId,
//           userId: data.userId,
//           startDate: data.startDate,
//           auto: data.auto,
//           shifts: data.shifts
//         }
//       );
//       const newSession = response.createScheduleSession;
//       setSessions(prev => [...prev, newSession]);
//     } catch (error: any) {
//       console.error("Failed to create schedule session:", error.message || error);
//     }
//   };

//   return (
//     <ScheduleSessionContext.Provider value={{ sessions, createSession }}>
//       {children}
//     </ScheduleSessionContext.Provider>
//   );
// };

// export const useScheduleSession = () => {
//   const context = useContext(ScheduleSessionContext);
//   if (!context) {
//     throw new Error("useScheduleSession must be used within a ScheduleSessionProvider");
//   }
//   return context;
// };

import React, { createContext, useContext, useState } from "react";
import { graphQLClient } from "../GraphqlClient";
import { CREATE_SCHEDULE_SESSION } from "../graphql/mutation"; // Add GET query
import { GET_SCHEDULE_SESSIONS } from "../graphql/queries";

type ShiftInput = {
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
};

type CreateSessionInput = {
  clientId: number;
  addressId: number;
  userId: number;
  startDate: string;
  auto?: boolean;
  shifts: ShiftInput[];
};

type ScheduleSession = {
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  startDate: string;
  auto: boolean;
  createdAt: string;
  client: { id: number; name: string };
  address: { id: number; address: string };
  user: { id: number; name: string };
  shifts: (ShiftInput & { id: number })[];
};

type ScheduleSessionContextType = {
  sessions: ScheduleSession[];
  createSession: (data: CreateSessionInput) => Promise<void>;
  fetchSessions: (startDate: string) => Promise<void>; // NEW
};

type CreateScheduleSessionResponse = {
  createScheduleSession: ScheduleSession;
};

type ScheduleSessionQueryResponse = {
  scheduleSessions: {
    data: ScheduleSession[];
    lastPage: number;
  };
};

const ScheduleSessionContext = createContext<ScheduleSessionContextType | undefined>(undefined);

export const ScheduleSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);

  const createSession = async (data: CreateSessionInput) => {
    try {
      const response = await graphQLClient.request<CreateScheduleSessionResponse>(
        CREATE_SCHEDULE_SESSION,
        {
          clientId: data.clientId,
          addressId: data.addressId,
          userId: data.userId,
          startDate: data.startDate,
          auto: data.auto,
          shifts: data.shifts
        }
      );
      const newSession = response.createScheduleSession;
      setSessions(prev => [...prev, newSession]);
    } catch (error: any) {
      console.error("Failed to create schedule session:", error.message || error);
    }
  };

  const fetchSessions = async (startDate: string) => {
    try {
      const response = await graphQLClient.request<ScheduleSessionQueryResponse>(
        GET_SCHEDULE_SESSIONS,
        { startDate }
      );
      setSessions(response.scheduleSessions.data);
    } catch (error: any) {
      console.error("Failed to fetch schedule sessions:", error.message || error);
    }
  };

  return (
    <ScheduleSessionContext.Provider value={{ sessions, createSession, fetchSessions }}>
      {children}
    </ScheduleSessionContext.Provider>
  );
};

export const useScheduleSession = () => {
  const context = useContext(ScheduleSessionContext);
  if (!context) {
    throw new Error("useScheduleSession must be used within a ScheduleSessionProvider");
  }
  return context;
};

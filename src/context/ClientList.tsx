// // context/ScheduleSessionContext.tsx
// import React, { createContext, useContext, useReducer, ReactNode } from 'react';
// import { graphQLClient } from '../GraphqlClient';

// // GraphQL Query
// const GET_SCHEDULE_SESSIONS = `
//   query GetScheduleSessions($page: Int, $startDate: String) {
//     scheduleSessions(page: $page, startDate: $startDate) {
//       data {
//         id
//         clientId
//         addressId
//         userId
//         startDate
//         endDate
//         auto
//         createdAt
//         weeklyHours
//         client {
//           name
//           lastName
//           email
//         }
//         address {
//           industry
//         address
//           city
//           state
//           pincode
//         }
//         user {
//           id
//           name
//           email
//         }
       
//       }
//       lastPage
//     }
//   }
// `;

// // Types
// export interface ScheduleSession {
//   id: number;
//   clientId: number;
//   addressId: number;
//   userId: number;
//   startDate: string;
//   endDate?: string;
//   auto: boolean;
//   createdAt?: string;
//   weeklyHours?: number;
//   client: {
//     name: string;
//     email: string;
//     lastName: string;
//   };
//   address: {
//     industry: string;
//     address: string;
//     city: string;
//     state: string;
//     pincode: string;
//   };
//   user: {
//     id: number;
//     name: string;
//     email: string;
//   };
//   shifts: Array<{
//     id: number;
//     scheduleSessionId: number;
//     date: string;
//     confirm: boolean;
//     reject: boolean;
//     startTime: string;
//     endTime: string;
//     hours: number;
//     actualHours?: number;
//   }>;
// }

// interface ScheduleSessionState {
//   scheduleSessions: ScheduleSession[];
//   loading: boolean;
//   error: string | null;
//   lastPage: number;
//   currentPage: number;
// }

// type ScheduleSessionAction =
//   | { type: 'SET_LOADING'; payload: boolean }
//   | { type: 'SET_ERROR'; payload: string | null }
//   | { type: 'SET_SCHEDULE_SESSIONS'; payload: { data: ScheduleSession[]; lastPage: number } }
//   | { type: 'SET_CURRENT_PAGE'; payload: number };

// // Initial state
// const initialState: ScheduleSessionState = {
//   scheduleSessions: [],
//   loading: false,
//   error: null,
//   lastPage: 1,
//   currentPage: 1,
// };

// // Reducer
// const scheduleSessionReducer = (
//   state: ScheduleSessionState,
//   action: ScheduleSessionAction
// ): ScheduleSessionState => {
//   switch (action.type) {
//     case 'SET_LOADING':
//       return { ...state, loading: action.payload };
//     case 'SET_ERROR':
//       return { ...state, error: action.payload, loading: false };
//     case 'SET_SCHEDULE_SESSIONS':
//       return {
//         ...state,
//         scheduleSessions: action.payload.data,
//         lastPage: action.payload.lastPage,
//         loading: false,
//         error: null,
//       };
//     case 'SET_CURRENT_PAGE':
//       return { ...state, currentPage: action.payload };
//     default:
//       return state;
//   }
// };

// // Context
// interface ScheduleSessionContextType {
//   state: ScheduleSessionState;
//   fetchScheduleSessions: (page?: number, startDate?: string) => Promise<void>;
//   setCurrentPage: (page: number) => void;
// }

// const ScheduleSessionContext = createContext<ScheduleSessionContextType | undefined>(undefined);

// // Provider
// interface ScheduleSessionProviderProps {
//   children: ReactNode;
// }

// export const ScheduleSessionProviderClient: React.FC<ScheduleSessionProviderProps> = ({ children }) => {
//   const [state, dispatch] = useReducer(scheduleSessionReducer, initialState);

//   const fetchScheduleSessions = async (page?: number, startDate?: string): Promise<void> => {
//     try {
//       dispatch({ type: 'SET_LOADING', payload: true });

//       const variables: { page?: number; startDate?: string } = {};
//       if (page) variables.page = page;
//       if (startDate) variables.startDate = startDate;

//       const response = await graphQLClient.request<{
//         scheduleSessions: { data: ScheduleSession[]; lastPage: number };
//       }>(GET_SCHEDULE_SESSIONS, variables);

//       dispatch({
//         type: 'SET_SCHEDULE_SESSIONS',
//         payload: {
//           data: response.scheduleSessions.data,
//           lastPage: response.scheduleSessions.lastPage,
//         },
//       });
//     } catch (err: any) {
//       dispatch({
//         type: 'SET_ERROR',
//         payload: err.message || 'Failed to fetch schedule sessions',
//       });
//       console.error('GraphQL Error:', err);
//     }
//   };

//   const setCurrentPage = (page: number) => {
//     dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
//   };

//   const contextValue: ScheduleSessionContextType = {
//     state,
//     fetchScheduleSessions,
//     setCurrentPage,
//   };

//   return (
//     <ScheduleSessionContext.Provider value={contextValue}>
//       {children}
//     </ScheduleSessionContext.Provider>
//   );
// };

// // Custom hook
// export const useScheduleSessionContext = () => {
//   const context = useContext(ScheduleSessionContext);
//   if (context === undefined) {
//     throw new Error('useScheduleSessionContext must be used within a ScheduleSessionProvider');
//   }
//   return context;
// };

// context/ScheduleSessionContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { graphQLClient } from '../GraphqlClient';

// GraphQL Query
const GET_SCHEDULE_SESSIONS = `
  query GetScheduleSessions($page: Int) {
    allAddresses(page: $page) {
      data {
        contractHour
        client {
          name
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

// Types
export interface ScheduleSession {
  contractHour: number;
  client: {
    name: string;
  };
  address: string;
  industry: string;
  city: string;
  state: string;
  pincode: string;
}

interface ScheduleSessionState {
  scheduleSessions: ScheduleSession[];
  loading: boolean;
  error: string | null;
  lastPage: number;
  currentPage: number;
}

type ScheduleSessionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SCHEDULE_SESSIONS'; payload: { data: ScheduleSession[]; lastPage: number } }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'APPEND_SCHEDULE_SESSIONS'; payload: { data: ScheduleSession[]; lastPage: number } };

// Initial state
const initialState: ScheduleSessionState = {
  scheduleSessions: [],
  loading: false,
  error: null,
  lastPage: 1,
  currentPage: 1,
};

// Reducer
const scheduleSessionReducer = (
  state: ScheduleSessionState,
  action: ScheduleSessionAction
): ScheduleSessionState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_SCHEDULE_SESSIONS':
      return {
        ...state,
        scheduleSessions: action.payload.data,
        lastPage: action.payload.lastPage,
        loading: false,
        error: null,
      };
    case 'APPEND_SCHEDULE_SESSIONS':
      return {
        ...state,
        scheduleSessions: [...state.scheduleSessions, ...action.payload.data],
        lastPage: action.payload.lastPage,
        loading: false,
        error: null,
      };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    default:
      return state;
  }
};

// Context
interface ScheduleSessionContextType {
  state: ScheduleSessionState;
  fetchScheduleSessions: (page?: number, append?: boolean) => Promise<void>;
  setCurrentPage: (page: number) => void;
  loadNextPage: () => Promise<void>;
  refreshScheduleSessions: () => Promise<void>;
}

const ScheduleSessionContext = createContext<ScheduleSessionContextType | undefined>(undefined);

// Provider
interface ScheduleSessionProviderProps {
  children: ReactNode;
}

export const ScheduleSessionProviderClient: React.FC<ScheduleSessionProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(scheduleSessionReducer, initialState);

  const fetchScheduleSessions = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const variables: { page: number } = { page };

      const response = await graphQLClient.request<{
        allAddresses: { data: ScheduleSession[]; lastPage: number };
      }>(GET_SCHEDULE_SESSIONS, variables);

      dispatch({
        type: append ? 'APPEND_SCHEDULE_SESSIONS' : 'SET_SCHEDULE_SESSIONS',
        payload: {
          data: response.allAddresses.data,
          lastPage: response.allAddresses.lastPage,
        },
      });

      if (!append) {
        dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
      }
    } catch (err: any) {
      dispatch({
        type: 'SET_ERROR',
        payload: err.message || 'Failed to fetch schedule sessions',
      });
      console.error('GraphQL Error:', err);
    }
  };

  const setCurrentPage = (page: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  };

  const loadNextPage = async (): Promise<void> => {
    if (state.currentPage < state.lastPage && !state.loading) {
      const nextPage = state.currentPage + 1;
      await fetchScheduleSessions(nextPage, true);
      dispatch({ type: 'SET_CURRENT_PAGE', payload: nextPage });
    }
  };

  const refreshScheduleSessions = async (): Promise<void> => {
    await fetchScheduleSessions(1, false);
  };

  const contextValue: ScheduleSessionContextType = {
    state,
    fetchScheduleSessions,
    setCurrentPage,
    loadNextPage,
    refreshScheduleSessions,
  };

  return (
    <ScheduleSessionContext.Provider value={contextValue}>
      {children}
    </ScheduleSessionContext.Provider>
  );
};

// Custom hook
export const useScheduleSessionContext = () => {
  const context = useContext(ScheduleSessionContext);
  if (context === undefined) {
    throw new Error('useScheduleSessionContext must be used within a ScheduleSessionProvider');
  }
  return context;
};
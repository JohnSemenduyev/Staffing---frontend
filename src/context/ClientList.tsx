import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { gql } from "graphql-request";
import { graphQLClient } from '../GraphqlClient';
import {CREATE_CLIENT_WITH_ADDRESSES, GET_SCHEDULE_SESSIONS} from '../graphql/mutation'
// ---------------- GraphQL ----------------



interface CreateClientWithAddressesResponse {
  createClientWithAddresses: {
    id: string;
    name: string;
  };
}

// ---------------- Types ----------------
export interface ScheduleSession {
  id: number;
  contractHour: number;
  client: {
    id: number;
    name: string;
    lastName?: string;
  };
  address: string;
  industry: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
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

// ---------------- Initial State ----------------
const initialState: ScheduleSessionState = {
  scheduleSessions: [],
  loading: false,
  error: null,
  lastPage: 1,
  currentPage: 1,
};

// ---------------- Reducer ----------------
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

// ---------------- Context ----------------
interface ScheduleSessionContextType {
  state: ScheduleSessionState;
  fetchScheduleSessions: (page?: number, append?: boolean) => Promise<void>;
  fetchAllScheduleSessionsForExport: () => Promise<ScheduleSession[]>;
  setCurrentPage: (page: number) => void;
  loadNextPage: () => Promise<void>;
  refreshScheduleSessions: () => Promise<void>;
  createClient: (input: any) => Promise<any>;   // <-- new mutation
}

const ScheduleSessionContext = createContext<ScheduleSessionContextType | undefined>(undefined);

// ---------------- Provider ----------------
interface ScheduleSessionProviderProps {
  children: ReactNode;
}

export const ScheduleSessionProviderClient: React.FC<ScheduleSessionProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(scheduleSessionReducer, initialState);

  const fetchScheduleSessions = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await graphQLClient.request<{
        allAddresses: { data: ScheduleSession[]; lastPage: number };
      }>(GET_SCHEDULE_SESSIONS, { page });

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

  /** Fetch all schedule sessions (all pages) for PDF/Excel export so all records are visible. */
  const fetchAllScheduleSessionsForExport = async (): Promise<ScheduleSession[]> => {
    const all: ScheduleSession[] = [];
    let page = 1;
    let lastPage = 1;
    do {
      const response = await graphQLClient.request<{
        allAddresses: { data: ScheduleSession[]; lastPage: number };
      }>(GET_SCHEDULE_SESSIONS, { page });
      all.push(...response.allAddresses.data);
      lastPage = response.allAddresses.lastPage;
      page++;
    } while (page <= lastPage);
    return all;
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

  // 🔥 New Mutation function
  const createClient = async (input: any): Promise<CreateClientWithAddressesResponse["createClientWithAddresses"]> => {
  try {
    dispatch({ type: 'SET_LOADING', payload: true });

    // Sanitize payload: remove null/undefined latitude/longitude fields from addresses
    const sanitizedInput = {
      ...input,
      addresses: Array.isArray(input?.addresses)
        ? input.addresses.map((addr: any) => {
            const { latitude, longitude, longitute, ...rest } = addr || {};
            const cleaned: any = { ...rest };
            if (latitude !== null && latitude !== undefined) cleaned.latitude = latitude;
            // Backend expects 'longitute'; include only if provided and not null under either spelling
            const lonVal = longitute !== undefined ? longitute : longitude;
            if (lonVal !== null && lonVal !== undefined) cleaned.longitute = lonVal;
            return cleaned;
          })
        : input?.addresses,
    };

    const response = await graphQLClient.request<CreateClientWithAddressesResponse>(
      CREATE_CLIENT_WITH_ADDRESSES,
      { input: sanitizedInput }
    );

    dispatch({ type: 'SET_LOADING', payload: false });

    return response.createClientWithAddresses;
  } catch (err: any) {
    dispatch({
      type: 'SET_ERROR',
      payload: err.message || 'Failed to create client',
    });
    throw err;
  }
};

  const contextValue: ScheduleSessionContextType = {
    state,
    fetchScheduleSessions,
    fetchAllScheduleSessionsForExport,
    setCurrentPage,
    loadNextPage,
    refreshScheduleSessions,
    createClient, // expose mutation in context
  };

  return (
    <ScheduleSessionContext.Provider value={contextValue}>
      {children}
    </ScheduleSessionContext.Provider>
  );
};

// ---------------- Custom Hook ----------------
export const useScheduleSessionContext = () => {
  const context = useContext(ScheduleSessionContext);
  if (context === undefined) {
    throw new Error('useScheduleSessionContext must be used within a ScheduleSessionProvider');
  }
  return context;
};

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import { graphQLClient } from "../GraphqlClient";
import {
  GET_UNIQUE_CLIENT_ADDRESS_SESSIONS,
  SCHEDULE_SESSIONS_WITH_DRAFT_DATA,
  SESSIONS_BY_SCHEDULE_SESSION,
} from "../graphql/queries";
import {
  BULK_UPSERT_SCHEDULE_SESSION,
  UPDATE_MANY_SESSION_TIMES,
  CHECK_SCHEDULE_SESSION,
  CREATE_DRAFT_SCHEDULE_SESSIONS,
  DELETE_DRAFT_SCHEDULE,
} from "../graphql/mutation";
import { formatClockDateForApi, normalizeClockDateToYmd } from "../utils/sessionCalendar";
import { getAdjustedDate, shiftSpansNextDay, timeToMinutes } from "../lib/utils";

// ---------- Types ----------

export type Address = {
  address: string;
  city: string;
  state: string;
  pincode: string;
};

export type Client = {
  name: string;
  lastName?: string;
};

export type User = {
  id: number;
  name: string;
  phone?: string;
};

export type ClientSession = {
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  client: Client;
  address: Address;
};

export type Shift = {
  startTime: string;
  endTime: string;
  hours: number;
  actualHours: number;
  id: number;
  scheduleSessionId: number;
  date: string;
  auto?: boolean;
  confirm?: boolean;
  reject?: boolean;
};

export type SessionItem = {
  id: number;
  shiftId?: number;
  scheduleSessionId: number;
  clockIn: string;
  clockOut?: string | null;
  clockInDate?: string | null;
  clockOutDate?: string | null;
  workedTime: number;
  shift?: {
    id: number;
    date: string;
    startTime?: string;
    endTime?: string;
  };
};

export type ScheduleSession = {
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  startDate: string;
  endDate?: string;
  auto: boolean;
  createdAt?: string;
  client?: Client;
  address?: Address;
  weeklyHours?: number;
  user?: User;
  shifts?: Shift[];
};

export type ScheduleUser = {
  id: number;
  name: string;
  lastName?: string;
  phone?: string;
};

// New: drafts support
export type DraftShift = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  auto?: boolean;
  scheduleSessionId?: number | null;
  draftScheduleSessionId?: number | null;
};

export type ScheduleSessionWithDraft = {
  auto: boolean;
  shifts: Shift[];
  draftShifts: DraftShift[];
  user: ScheduleUser;
  client: Client;
  address: Address;
  clientId: number;
  addressId: number;
  weeklyHours: number;
};

export type DraftScheduleSession = {
  clientId: number;
  addressId: number;
  weeklyHours: number;
  client: Client;
  user: ScheduleUser;
  draftShifts: DraftShift[];
  address: Address;
};

// Now ScheduleData is an object with two arrays
export type ScheduleData = {
  scheduleSessions: ScheduleSessionWithDraft[];
  draftScheduleSessions: DraftScheduleSession[];
};

// For backward compatibility if anything still uses ScheduleDataItem
export type ScheduleDataItem = ScheduleSessionWithDraft;

// New input type for mutation
export type ShiftInput = {
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  shiftId?: number;
  auto?: boolean | null;
  guardPrepared?: boolean | null;
};

export type ScheduleSessionInputExtended = {
  scheduleSessionId?: number | null;
  clientId: number | null;
  addressId: number | null;
  userId: number | null;
  startDate: string | null;
  endDate: string | null;
  auto: boolean | null;
  weeklyHours: number | null;
  NextWeekHours?: number | null;
  shifts: ShiftInput[];
  change?: boolean | null;
};

// ---------- Context type ----------

type ClientSessionContextType = {
  clientSessions: ClientSession[] | null;
  loading: boolean;
  error: string | null;
  fetchClientSessions: () => Promise<void>;

  scheduleData: ScheduleData | null;
  scheduleLoading: boolean;
  scheduleError: string | null;
  fetchScheduleData: (
    clientId?: number | null,
    addressId?: number | null,
    date?: string,
    userid?: number | null
  ) => Promise<void>;
  clearScheduleData: () => void;

  bulkUpsertScheduleSessions: (
    input: ScheduleSessionInputExtended[]
  ) => Promise<any>;
  createDraftScheduleSessions: (input: any[]) => Promise<any>;
  deleteDraftSchedule: (draftScheduleSessionId: number) => Promise<any>;
  mutationLoading: boolean;

  sessionData: SessionItem[] | null;
  sessionLoading: boolean;
  sessionError: string | null;
  fetchSessionData: (scheduleSessionIds: number[], shiftId?: number[]) => Promise<void>;
  clearSessionData: () => void;
  updateSessionTimes: (sessionUpdates: Array<{
    sessionId?: number | null;
    shiftId: number;
    scheduleSessionId: number;
    clockIn?: string;
    clockOut?: string | null;
    clockInDate?: string | null;
    clockOutDate?: string | null;
    isDelete?: boolean;
  }>) => Promise<SessionItem[]>;
  checkScheduleSession: (
    clientId: number,
    addressId: number,
    userId: number,
    startDate: string
  ) => Promise<any>;
};

// ---------- Context + Provider ----------

const ClientSessionContext = createContext<
  ClientSessionContextType | undefined
>(undefined);

export const ClientSessionProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [clientSessions, setClientSessions] = useState<ClientSession[] | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [mutationLoading, setMutationLoading] = useState<boolean>(false);

  const [sessionData, setSessionData] = useState<SessionItem[] | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const genericError = (
    op:
      | "fetchClientSessions"
      | "fetchSchedule"
      | "bulkUpsert"
      | "fetchSessions"
      | "updateTimes",
    err: any
  ) => {
    const msg = String(err?.response?.errors?.[0]?.message || err?.message || "");
    if (/unauthorized|forbidden/i.test(msg))
      return "Your session has expired. Please sign in again.";
    if (/invalid\s+(date|time)/i.test(msg))
      return "Invalid input. Please check your entries and try again.";
    if (op === "updateTimes" && /non-empty array/i.test(msg))
      return "No valid sessions to publish.";
    return "Something went wrong. Please try again.";
  };

  // ----- fetchClientSessions -----

  const fetchClientSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("token");
      const response = await graphQLClient.request<{
        ScheduleSessionsByClientWeekForManager: ClientSession[];
      }>(
        GET_UNIQUE_CLIENT_ADDRESS_SESSIONS,
        {},
        { Authorization: `Bearer ${token}` }
      );
      setClientSessions(response.ScheduleSessionsByClientWeekForManager);
    } catch (err) {
      console.error("fetchClientSessions:", err);
      setError(genericError("fetchClientSessions", err));
    } finally {
      setLoading(false);
    }
  };

  // ----- fetchScheduleData (NEW QUERY) -----

  const fetchScheduleData = async (
    clientId?: number | null,
    addressId?: number | null,
    date?: string,
    userid?: number | null
  ) => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const token = sessionStorage.getItem("token");
      const response = await graphQLClient.request<{
        ScheduleSessionsWithDraftData: ScheduleData;
      }>(
        SCHEDULE_SESSIONS_WITH_DRAFT_DATA,
        {
          ...(clientId !== undefined && clientId !== null ? { clientId } : {}),
          ...(addressId !== undefined && addressId !== null ? { addressId } : {}),
          ...(date ? { date } : {}),
          ...(userid !== undefined && userid !== null ? { userid } : {}),
        },
        { Authorization: `Bearer ${token}` }
      );

      setScheduleData(response.ScheduleSessionsWithDraftData);
    } catch (err) {
      console.error("fetchScheduleData:", err);
      setScheduleError(genericError("fetchSchedule", err));
      setScheduleData(null);
    } finally {
      setScheduleLoading(false);
    }
  };

  const clearScheduleData = () => {
    setScheduleData(null);
    setScheduleError(null);
  };

  // ----- Bulk upsert schedule sessions -----

  const bulkUpsertScheduleSessions = async (
    input: ScheduleSessionInputExtended[]
  ) => {
    setMutationLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await graphQLClient.request(
        BULK_UPSERT_SCHEDULE_SESSION,
        { input },
        { Authorization: `Bearer ${token}` }
      );
      // let calling component handle the result & toast
      return response;
    } catch (err) {
      console.error("bulkUpsertScheduleSessions:", err);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  // ----- fetchSessionData -----

  // ----- fetchSessionData -----

  const fetchSessionData = async (scheduleSessionIds: number[], shiftId: number[] = []) => {
    setSessionLoading(true);
    setSessionError(null);
    try {
      const token = sessionStorage.getItem("token");
      const uniqueScheduleSessionIds = [...new Set(scheduleSessionIds.filter(id => id > 0))];
      const uniqueShiftIds = [...new Set(shiftId.filter(id => id > 0))];

      if (uniqueScheduleSessionIds.length === 0 && uniqueShiftIds.length === 0) {
        setSessionData([]);
        setSessionLoading(false);
        return;
      }

      const response = await graphQLClient.request<{
        sessionsByScheduleSession: SessionItem[];
      }>(
        SESSIONS_BY_SCHEDULE_SESSION,
        { scheduleSessionId: uniqueScheduleSessionIds, shiftId: uniqueShiftIds },
        { Authorization: `Bearer ${token}` }
      );

      const mappedSessions = response.sessionsByScheduleSession.map((s) => ({
        ...s,
        clockInDate:
          s.clockInDate != null && String(s.clockInDate).trim() !== ""
            ? normalizeClockDateToYmd(s.clockInDate) || null
            : s.clockInDate,
        clockOutDate:
          s.clockOutDate != null && String(s.clockOutDate).trim() !== ""
            ? normalizeClockDateToYmd(s.clockOutDate) || null
            : s.clockOutDate,
      }));
      setSessionData(mappedSessions);
    } catch (err) {
      console.error("fetchSessionData:", err);
      setSessionError(genericError("fetchSessions", err));
      setSessionData(null);
    } finally {
      setSessionLoading(false);
    }
  };

  const clearSessionData = () => {
    setSessionData(null);
    setSessionError(null);
  };

  // ----- updateSessionTimes -----

  const updateSessionTimes = async (sessionUpdates: Array<{
    sessionId?: number | null;
    shiftId: number;
    scheduleSessionId: number;
    clockIn?: string;
    clockOut?: string | null;
    clockInDate?: string | null;
    clockOutDate?: string | null;
    isDelete?: boolean;
  }>) => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const shiftMetaById = new Map<number, { date?: string; startTime?: string; endTime?: string }>();
      if (scheduleData) {
        scheduleData.scheduleSessions.forEach((item) => {
          item.shifts?.forEach((shift) => {
            shiftMetaById.set(shift.id, {
              date: shift.date,
              startTime: shift.startTime,
              endTime: shift.endTime,
            });
          });
          item.draftShifts?.forEach((shift) => {
            shiftMetaById.set(shift.id, {
              date: shift.date,
              startTime: shift.startTime,
              endTime: shift.endTime,
            });
          });
        });
      }

      const transformedUpdates = sessionUpdates.map((update) => {
        const base: any = {
          shiftId: update.shiftId,
          scheduleSessionId: update.scheduleSessionId,
        };
        const shiftMeta = shiftMetaById.get(update.shiftId);

        const explicitClockInDate = normalizeClockDateToYmd(update.clockInDate);
        const explicitClockOutDate = normalizeClockDateToYmd(update.clockOutDate);
        const effectiveClockInDate = explicitClockInDate || "";

        const hasOvernightShift =
          !!shiftMeta?.startTime &&
          !!shiftMeta?.endTime &&
          shiftSpansNextDay(shiftMeta.startTime, shiftMeta.endTime);
        const hasOvernightTimes =
          !!update.clockIn &&
          !!update.clockOut &&
          timeToMinutes(update.clockOut) < timeToMinutes(update.clockIn);
        const derivedClockOutDate =
          update.clockOut && effectiveClockInDate
            ? (hasOvernightShift || hasOvernightTimes
              ? getAdjustedDate(effectiveClockInDate, 1)
              : effectiveClockInDate)
            : "";
        const effectiveClockOutDate = explicitClockOutDate || derivedClockOutDate;

        if (update.sessionId !== undefined && update.sessionId !== null) {
          base.sessionId = update.sessionId;
        }
        if (update.clockIn) {
          base.clockIn = update.clockIn;
        }
        if (update.clockOut) {
          base.clockOut = update.clockOut;
        }
        if (effectiveClockInDate) {
          const api = formatClockDateForApi(effectiveClockInDate);
          if (api) base.clockInDate = api;
        }
        if (
          update.clockOut &&
          effectiveClockOutDate
        ) {
          const api = formatClockDateForApi(effectiveClockOutDate);
          if (api) base.clockOutDate = api;
        }
        if (update.isDelete === true) {
          base.isDelete = true;
        }

        return base;
      });

      const response = await graphQLClient.request<{
        updateManySessionTimes: SessionItem[];
      }>(
        UPDATE_MANY_SESSION_TIMES,
        { items: transformedUpdates },
        { Authorization: `Bearer ${token}` }
      );

      console.log("Session times updated:", response.updateManySessionTimes);

      // Refresh session data after update using the new scheduleData shape
      if (scheduleData) {
        const scheduleSessionIds = new Set<number>();

        // From scheduleSessions' regular shifts and draftShifts
        scheduleData.scheduleSessions.forEach((item) => {
          item.shifts.forEach((shift) => {
            if (shift.scheduleSessionId) {
              scheduleSessionIds.add(shift.scheduleSessionId);
            }
          });

          item.draftShifts.forEach((draft) => {
            if (draft.scheduleSessionId) {
              scheduleSessionIds.add(draft.scheduleSessionId);
            }
          });
        });

        await fetchSessionData(Array.from(scheduleSessionIds));
      }

      return response.updateManySessionTimes;
    } catch (error) {
      console.error("updateSessionTimes:", error);
      throw error;
    }
  };

  // ----- checkScheduleSession -----

  const checkScheduleSession = async (
    clientId: number,
    addressId: number,
    userId: number,
    startDate: string
  ) => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await graphQLClient.request<{
        checkScheduleSession: any;
      }>(
        CHECK_SCHEDULE_SESSION,
        { clientId, addressId, userId, startDate },
        { Authorization: `Bearer ${token}` }
      );

      return {
        data: {
          checkScheduleSession: response.checkScheduleSession,
        },
      };
    } catch (error) {
      console.error("checkScheduleSession:", error);
      throw error;
    }
  };

  // ----- createDraftScheduleSessions -----

  const createDraftScheduleSessions = async (input: any[]) => {
    setMutationLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await graphQLClient.request(
        CREATE_DRAFT_SCHEDULE_SESSIONS,
        { input },
        { Authorization: `Bearer ${token}` }
      );
      return response;
    } catch (err) {
      console.error("createDraftScheduleSessions:", err);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  // ----- deleteDraftSchedule -----
  // Use when a draft session has only one shift and that shift is being deleted.

  const deleteDraftSchedule = async (draftScheduleSessionId: number) => {
    setMutationLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await graphQLClient.request(
        DELETE_DRAFT_SCHEDULE,
        { draftScheduleSessionId },
        { Authorization: `Bearer ${token}` }
      );
      return response;
    } catch (err) {
      console.error("deleteDraftSchedule:", err);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  return (
    <ClientSessionContext.Provider
      value={{
        clientSessions,
        loading,
        error,
        fetchClientSessions,
        scheduleData,
        scheduleLoading,
        scheduleError,
        fetchScheduleData,
        clearScheduleData,
        bulkUpsertScheduleSessions,
        createDraftScheduleSessions,
        deleteDraftSchedule,
        mutationLoading,
        sessionData,
        sessionLoading,
        sessionError,
        fetchSessionData,
        clearSessionData,
        updateSessionTimes,
        checkScheduleSession,
      }}
    >
      {children}
    </ClientSessionContext.Provider>
  );
};

// ---------- Hook ----------

export const useClientSessions = () => {
  const context = useContext(ClientSessionContext);
  if (!context) {
    throw new Error(
      "useClientSessions must be used within a ClientSessionProvider"
    );
  }
  return context;
};

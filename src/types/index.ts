// src/types/index.ts
export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
}

export interface Address {
  id: number;
  clientId: number;
  label?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  createdAt: string;
}
export interface Assignment {
  id: number;
  userId: number;
  guardId: number | null;         // make nullable to match backend reality
  clientId: number;
  addressId: number;
  role: string;
  access: string;
  notification: string[];
  notificationSubCat?: string[];
  createdAt: string;

  clientRegId?: number | null;    // 🔹 NEW

  user?: { id: number; name: string; lastName?: string };
  guard?: { id: number; name: string; lastName?: string };

  clientregistration?: {          // 🔹 NEW
    name: string;
    lastName?: string;
  };

  client?: { id: number; name: string; lastName?: string };
  address?: {
    id: number;
    label: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}


export type GuardStatus = "active" | "inactive";

export interface Guard {
  id: number;
  name: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  status: GuardStatus;
  createdAt: string;
}
export type UserRole = "admin" | "manager";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  password: string; // Consider omitting this from lists for security!
  role: UserRole;
  createdAt: string;
}
export interface UpdateOneSessionTimesInput {
  sessionId: number;
  clockIn: string;
  clockOut: string;
}

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
  guardId: number;
  clientId: number;
  user: any;        // (Or your actual User type)
  guard: any;       // (Or your actual Guard type)
  client: any;      // (Or your actual Client type)
  notification: string[];
  address: Address;
  addressId: number;
  role: string;
  access: string;
  createdAt: string;
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

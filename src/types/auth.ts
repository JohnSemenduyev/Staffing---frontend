export type UserRole = 'admin' | 'manager' | 'client' | 'guard';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  isAuth: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
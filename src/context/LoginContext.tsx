import React, { createContext, useState, useContext, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { gql } from "graphql-request";

// GraphQL Mutation
const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      token
      role
    }
  }
`;

// Types
type AuthContextType = {
  token: string | null;
  role: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
};
type LoginUserResponse = {
  loginUser: {
    token: string;
    role: string;
  };
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem("role"));

const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const variables = { email, password };
    const data = await graphQLClient.request<LoginUserResponse>(LOGIN_USER, variables);
    const { token, role } = data.loginUser;

    setToken(token);
    setRole(role);

    localStorage.setItem("token", token);
    localStorage.setItem("role", role);

    // ✅ Save full user object if needed
    localStorage.setItem("admin_portal_user", JSON.stringify({ token, role }));

    return { success: true };
  } catch (error: any) {
    console.error("Login failed:", error);
    return { success: false, error: "Invalid credentials or server error" };
  }
};



const logout = () => {
  setToken(null);
  setRole(null);
  
  // Remove all auth-related items from localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("admin_portal_user"); // ✅ Add this line
  
  // Optional: Clear all localStorage if you want to be extra sure
  // localStorage.clear();
};

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { graphQLClient } from "../GraphqlClient";
import { gql } from "graphql-request";
import { LOGIN_USER } from "../graphql/mutation";

type RoleType = 'client' | 'admin' | 'manager' | 'guard';


// Types
type AuthContextType = {
  token: string | null;
  roles: string[];
  isLoading: boolean;
  role: string | null;
  changeRoles?: (newRole: string) => void;
  login: (email: string, password: string) => Promise<{
  roles: string[] | undefined; 
    success: boolean;
    error?: string;
  }>;
  logout: () => void;
};
type LoginUserResponse = {
  loginUser: {
    token: string;
    roles: string[];
  };
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [roles, setRoles] = useState<string[]>(() => {
    const storedRoles = localStorage.getItem("roles");
    return storedRoles ? JSON.parse(storedRoles) : [];
  });
  const [role, setRole] = useState<string | null>(() => localStorage.getItem("role"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    const storedRoles = localStorage.getItem("roles");
    if (storedToken) setToken(storedToken);
    if (storedRole) setRole(storedRole);
    if (storedRoles) setRoles(JSON.parse(storedRoles));
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ roles: string[]; success: boolean; error?: string }> => {
    try {
      const variables = { email, password };
      const data = await graphQLClient.request<LoginUserResponse>(LOGIN_USER, variables);
      const { token, roles } = data.loginUser;
      const filteredRoles = roles.filter(role => [ 'admin', 'manager'].includes(role));
            // const filteredRoles = roles;

      setToken(token);
      setRoles(filteredRoles);

      localStorage.setItem("token", token);
      localStorage.setItem("roles", JSON.stringify(filteredRoles));

      // If only one role, select it automatically
      if (filteredRoles.length === 1) {
        setRole(filteredRoles[0]);
        localStorage.setItem("role", filteredRoles[0]);
        return { success: true, roles: filteredRoles };
        } 
      return { success: true, roles: filteredRoles };
  } catch (error: any) {
    console.error("Login failed:", error);


    let errorMessage = "Invalid credentials or server error";
      if (error.response?.errors && error.response.errors.length > 0) {
        const graphqlError = error.response.errors[0];
        if (graphqlError.message) {
          errorMessage = graphqlError.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage, roles: [] };
  }
};

  const logout = () => {
    setToken(null);
    setRoles([]);
    setRole(null);
    localStorage.removeItem("token");
    localStorage.removeItem("roles");
    localStorage.removeItem("role");
    localStorage.removeItem("admin_portal_user");
    localStorage.removeItem("scheduleData");
    localStorage.clear();
    window.location.reload();
  };

  const changeRoles = (newRole: string) => {
    setRole(newRole);
    localStorage.setItem("role", newRole);
  };

  return (
    <AuthContext.Provider value={{ token, role, roles, login, logout, isLoading, changeRoles }}>
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

import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { graphQLClient } from "../GraphqlClient";
import { setGraphQLToken } from "../GraphqlClient";
import { gql } from "graphql-request";
import { LOGIN_USER } from "../graphql/mutation";
import { ACCESS_TOKEN_REGENERATE } from "../graphql/mutation";
import { useToast } from '../hooks/use-toast';

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
  syncRolesFromSession: ()=>void
};
type LoginUserResponse = {
  loginUser: {
    token: string;
    roles: string[];
  };
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("token"));
  const [roles, setRoles] = useState<string[]>(() => {
    const storedRoles = sessionStorage.getItem("roles");
    return storedRoles ? JSON.parse(storedRoles) : [];
  });
  const [role, setRole] = useState<string | null>(() => sessionStorage.getItem("role"));
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setGraphQLToken(token);
  }, [token]);

  const syncRolesFromSession = () => {
    const storedRoles = sessionStorage.getItem("roles");
    setRoles(storedRoles ? JSON.parse(storedRoles) : []);
  };

  useEffect(() => {
    const storedToken = sessionStorage.getItem("token");
    const storedRole = sessionStorage.getItem("role");
    const storedRoles = sessionStorage.getItem("roles");
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
      const filteredRoles = roles.filter(role => ['admin', 'manager'].includes(role));
      // const filteredRoles = roles;

      setToken(token);
      setRoles(filteredRoles);

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("roles", JSON.stringify(filteredRoles));
      sessionStorage
      // Always return roles for selection, do not auto-select
      setRole(null);
      sessionStorage.removeItem("role");
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
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("roles");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("admin_portal_user");
    sessionStorage.removeItem("adminEmail");
    sessionStorage.removeItem("scheduleData");
    sessionStorage.clear();
    window.location.reload();
  };

  const changeRoles = async (newRole: string) => {
    try {
      // Call the API to regenerate the token for the new role
      const response : any= await graphQLClient.request<{ accessTokenReGenerate: { token: string; role: string; email: string } }>(
        ACCESS_TOKEN_REGENERATE,
        { role: newRole }
      );
      const { token: newToken, role: apiRole, email } = response.accessTokenReGenerate;

      setRole(apiRole);
      setToken(newToken);
      sessionStorage.setItem("role", apiRole);
      sessionStorage.setItem("token", newToken);
      if(apiRole==="admin"){
        sessionStorage.setItem("adminEmail",email)
      }
      setGraphQLToken(newToken);
    } catch (error) {
      console.error("Failed to regenerate access token for role change:", error);
      const msgs = error?.response?.errors?.map((e: any) => e?.message).filter(Boolean);
       toast({
    title: "Error",
    description: msgs,
    variant: "destructive",
  });
     }
  };

  return (
    <AuthContext.Provider value={{ token, role, roles, login, logout, isLoading, changeRoles, syncRolesFromSession }}>
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

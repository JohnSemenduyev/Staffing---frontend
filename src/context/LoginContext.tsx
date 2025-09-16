import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
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
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedRole = localStorage.getItem("role");
        
        if (storedToken && storedRole) {
          setToken(storedToken);
          setRole(storedRole);
        }
      } catch (error) {
        console.error("Error reading from localStorage:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);
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
    
    // Extract specific error message from GraphQL response
    let errorMessage = "Invalid credentials or server error";
    
    if (error.response?.errors && error.response.errors.length > 0) {
      const graphqlError = error.response.errors[0];
      if (graphqlError.message) {
        errorMessage = graphqlError.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
};



const logout = () => {
  setToken(null);
  setRole(null);
  
  // Remove all auth-related items from localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("admin_portal_user"); // ✅ Add this line
  localStorage.removeItem("scheduleData");
  localStorage.clear();
  window.location.reload();

};

  return (
    <AuthContext.Provider value={{ token, role, login, logout ,isLoading}}>
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

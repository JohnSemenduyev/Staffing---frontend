// import React, { createContext, useContext, useState, ReactNode } from 'react';
// import { graphQLClient } from '../GraphqlClient';
// import { CREATE_USER_ } from '../graphql/mutation';

// // TypeScript Interfaces
// export interface CreateUserInput {
//   name: string;
//   email: string;
//   password: string;
//   role: 'admin' | 'manager' | 'guard' | 'client';
//   address?: string;
//   zipcode?: string;
//   state?: string;
//   city?: string;
//   phone?: string;
//   lastName?: string;
// }

// export interface CreateUserResponse {
//   createUser: {
//     id: string;
//     name: string;
//     lastName: string;
//   };
// }

// // Context Interface
// interface UserRegistrationContextType {
//   createUser: (userData: CreateUserInput) => Promise<{ success: boolean; data?: CreateUserResponse; error?: string }>;
//   loading: boolean;
//   error: string | null;
//   clearError: () => void;
// }

// // Create Context
// const UserRegistrationContext = createContext<UserRegistrationContextType | undefined>(undefined);

// // Provider Props Interface
// interface UserRegistrationProviderProps {
//   children: ReactNode;
// }

// // Provider Component
// export const UserRegistrationProvider: React.FC<UserRegistrationProviderProps> = ({ children }) => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const createUser = async (userData: CreateUserInput): Promise<{ success: boolean; data?: CreateUserResponse; error?: string }> => {
//     console.log('🚀 Context createUser called with:', userData);
    
//     setLoading(true);
//     setError(null);

//     try {
//       // Prepare variables for GraphQL mutation
//       const variables: CreateUserInput = {
//         name: userData.name,
//         email: userData.email,
//         password: userData.password,
//         role: userData.role,
//         lastName: userData.lastName,
//         phone: userData.phone,
//         address: userData.address,
//         city: userData.city,
//         state: userData.state,
//         zipcode: userData.zipcode,
//       };

//       console.log('📋 Variables prepared:', variables);
//       console.log('📝 Mutation:', CREATE_USER_);
//       console.log('📡 Making GraphQL request using graphQLClient');

//       // Execute mutation
//       const data = await graphQLClient.request<CreateUserResponse>(CREATE_USER_, variables);

//       console.log('✅ GraphQL response:', data);
//       setLoading(false);
//       return { success: true, data };
//     } catch (err: any) {
//       console.error('❌ GraphQL error:', err);
//       console.error('❌ Error details:', {
//         message: err?.message,
//         response: err?.response,
//         errors: err?.response?.errors
//       });
      
//       const errorMessage = err?.response?.errors?.[0]?.message || err?.message || 'Failed to create user';
//       setError(errorMessage);
//       setLoading(false);
//       return { success: false, error: errorMessage };
//     }
//   };

//   const clearError = () => {
//     setError(null);
//   };

//   const value: UserRegistrationContextType = {
//     createUser,
//     loading,
//     error,
//     clearError,
//   };

//   console.log('🔄 UserRegistrationProvider rendered');

//   return (
//     <UserRegistrationContext.Provider value={value}>
//       {children}
//     </UserRegistrationContext.Provider>
//   );
// };

// // Custom Hook
// export const useUserRegistration = (): UserRegistrationContextType => {
//   const context = useContext(UserRegistrationContext);
//   if (context === undefined) {
//     throw new Error('useUserRegistration must be used within a UserRegistrationProvider');
//   }
//   console.log('🎣 useUserRegistration hook called');
//   return context;
// };

// export default UserRegistrationContext;
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { graphQLClient } from '../GraphqlClient';
import { CREATE_USER_ } from '../graphql/mutation';

// TypeScript Interfaces for User
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'guard' | 'client';
  company?: string;
  address?: string;
  zipcode?: string;
  state?: string;
  city?: string;
  phone?: string;
  lastName?: string;
}

export interface CreateUserResponse {
  createUser: {
    id: string;
    name: string;
    lastName: string;
  };
}

// Context Interface
interface UserRegistrationContextType {
  createUser: (userData: CreateUserInput) => Promise<{ success: boolean; data?: CreateUserResponse; error?: string }>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

// Create Context
const UserRegistrationContext = createContext<UserRegistrationContextType | undefined>(undefined);

// Provider Props Interface
interface UserRegistrationProviderProps {
  children: ReactNode;
}

// Provider Component
export const UserRegistrationProvider: React.FC<UserRegistrationProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = async (userData: CreateUserInput): Promise<{ success: boolean; data?: CreateUserResponse; error?: string }> => {
    console.log('🚀 Context createUser called with:', userData);
        
    setLoading(true);
    setError(null);

    try {
      // Prepare variables for GraphQL mutation
      const variables: CreateUserInput = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        company: userData.company,
        lastName: userData.lastName,
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        state: userData.state,
        zipcode: userData.zipcode,
      };

      console.log('📋 Variables prepared:', variables);
      console.log('📝 Mutation:', CREATE_USER_);
      console.log('📡 Making GraphQL request using graphQLClient');

      // Execute mutation
      const data = await graphQLClient.request<CreateUserResponse>(CREATE_USER_, variables);

      console.log('✅ GraphQL response:', data);
      setLoading(false);
      return { success: true, data };
    } catch (err: any) {
      console.error('❌ GraphQL error:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        response: err?.response,
        errors: err?.response?.errors
      });
            
      const errorMessage = err?.response?.errors?.[0]?.message || err?.message || 'Failed to create user';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: UserRegistrationContextType = {
    createUser,
    loading,
    error,
    clearError,
  };

  console.log('🔄 UserRegistrationProvider rendered');

  return (
    <UserRegistrationContext.Provider value={value}>
      {children}
    </UserRegistrationContext.Provider>
  );
};

// Custom Hook
export const useUserRegistration = (): UserRegistrationContextType => {
  const context = useContext(UserRegistrationContext);
  if (context === undefined) {
    throw new Error('useUserRegistration must be used within a UserRegistrationProvider');
  }
  console.log('🎣 useUserRegistration hook called');
  return context;
};

export default UserRegistrationContext;
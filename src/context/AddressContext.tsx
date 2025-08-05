// src/context/AddressContext.tsx
import React, { createContext, useContext, useState } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_ALL_ADDRESSES } from "../graphql/queries";

// Type definitions
export type Address = {
  id: number;
  clientId: number;
  label?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  createdAt: string;
  client: {
    id: number;
    name: string;
    lastName?: string;
    email: string;
    phone?: string;
    company: string;
  };
};

interface AddressContextType {
  addresses: Address[];
  currentPage: number;
  lastPage: number;
  loading: boolean;
  error: string | null;
  fetchAddresses: (page?: number) => Promise<void>;
  setCurrentPage: (page: number) => void;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export const AddressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = async (page = 1) => {
    setLoading(true);
    try {
      const data = await graphQLClient.request<{
        allAddresses: {
          data: Address[];
          lastPage: number;
        };
      }>(GET_ALL_ADDRESSES, { page });

      setAddresses(data.allAddresses.data);
      setLastPage(data.allAddresses.lastPage);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch addresses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddressContext.Provider
      value={{
        addresses,
        currentPage,
        lastPage,
        loading,
        error,
        fetchAddresses,
        setCurrentPage,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
};

export const useAddresses = () => {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error("useAddresses must be used within an AddressProvider");
  }
  return context;
};

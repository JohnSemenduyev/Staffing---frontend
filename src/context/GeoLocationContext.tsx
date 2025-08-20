// src/context/GeoLocationContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { GET_GEOLOCATIONS } from '../graphql/queries';
import { graphQLClient } from '../GraphqlClient';
import { CREATE_GEOLOCATION, DELETE_GEOLOCATION, UPDATE_GEOLOCATION } from '../graphql/mutation';

// TypeScript interfaces
export interface GeoLocation {
  id: number;
  clientId: number;
  addressId: number;
  distance?: number;
  time?: number;
  createdAt?: string;
  client: {
    id: number;
    name: string;
  };
  address: {
    id: number;
    label: string;
    address: string;
  };
}

interface GeoLocationInput {
  clientId: number;
  addressId: number;
  distance?: number;
  time?: number;
}

interface GeoLocationContextType {
  geoLocations: GeoLocation[];
  currentPage: number;
  lastPage: number;
  loading: boolean;
  error: string | null;
  submitLoader: boolean;
  submitError: string | null;
  currentFilter: Record<string, any> | null;
  fetchGeoLocations: (page?: number, filter?: Record<string, any> | null) => Promise<void>;
  setCurrentPage: (page: number) => void;
  createGeoLocation: (input: GeoLocationInput) => Promise<void>;
  deleteGeoLocation: (id: number) => Promise<void>;
  updateGeoLocation: (id: number, input: GeoLocationInput) => Promise<void>;
}

const GeoLocationContext = createContext<GeoLocationContextType | undefined>(undefined);

// Provider component
export const GeoLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [geoLocations, setGeoLocations] = useState<GeoLocation[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitLoader, setSubmitLoader] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<Record<string, any> | null>(null);

  const fetchGeoLocations = async (page: number = 1, filter?: Record<string, any> | null) => {
    setLoading(true);
    try {
      const effectiveFilter = filter !== undefined ? filter : currentFilter || undefined;
      const variables: any = { page };
      if (effectiveFilter && Object.keys(effectiveFilter).length > 0) {
        variables.filter = effectiveFilter;
      }
      const data = await graphQLClient.request<{
        geoLocations: {
        data: GeoLocation[];
        lastPage: number;
      };
    }>(GET_GEOLOCATIONS, variables);

    setGeoLocations(data.geoLocations.data);
    setLastPage(data.geoLocations.lastPage);
    setCurrentPage(page);
    setCurrentFilter(effectiveFilter ?? null);
    setError(null);
  } catch (err) {
    console.error(err);
    setError('Failed to fetch geolocations');
  } finally {
    setLoading(false);
  }
};

  const createGeoLocation = async (input: GeoLocationInput) => {
    try {
      setSubmitLoader(true);
      await graphQLClient.request(CREATE_GEOLOCATION, input);
      await fetchGeoLocations(currentPage); 
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to create geolocation');
      throw new Error('Failed to create geolocation');
    } finally {
      setSubmitLoader(false);
    }
  };

  const deleteGeoLocation = async (id: number) => {
    setLoading(true);
    try {
      await graphQLClient.request(DELETE_GEOLOCATION, { id });
      await fetchGeoLocations(currentPage);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete geolocation');
    } finally {
      setLoading(false);
    }
  };

  const updateGeoLocation = async (id: number, input: GeoLocationInput) => {
    try {
      setSubmitLoader(true);
      await graphQLClient.request(UPDATE_GEOLOCATION, { id, data: input });
      await fetchGeoLocations(currentPage);
      setSubmitError(null);
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to update geolocation');
      throw new Error('Failed to update geolocation');
    } finally {
      setSubmitLoader(false);
    }
  };


  return (
    <GeoLocationContext.Provider
      value={{
        geoLocations,
        currentPage,
        lastPage,
        loading,
        error,
        submitLoader,
        submitError,
        currentFilter,
        fetchGeoLocations,
        setCurrentPage,
        createGeoLocation,
        deleteGeoLocation,
        updateGeoLocation,
      }}
    >
      {children}
    </GeoLocationContext.Provider>
  );
};

// Hook to use the context
export const useGeoLocation = () => {
  const context = useContext(GeoLocationContext);
  if (!context) {
    throw new Error('useGeoLocation must be used within a GeoLocationProvider');
  }
  return context;
};

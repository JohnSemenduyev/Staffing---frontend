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
  loading: boolean;
  error: string | null;
  submitLoader: boolean;
  submitError: string | null;
  fetchGeoLocations: () => Promise<void>;
  createGeoLocation: (input: GeoLocationInput) => Promise<void>;
  deleteGeoLocation: (id: number) => Promise<void>;
  updateGeoLocation: (id: number, input: GeoLocationInput) => Promise<void>;
}

// Context creation
const GeoLocationContext = createContext<GeoLocationContextType | undefined>(undefined);

// Provider component
export const GeoLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [geoLocations, setGeoLocations] = useState<GeoLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitLoader, setSubmitLoader] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch all geo locations
  const fetchGeoLocations = async () => {
    setLoading(true);
    try {
      const data = await graphQLClient.request<{ geoLocations: GeoLocation[] }>(GET_GEOLOCATIONS);
      setGeoLocations(data.geoLocations);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch geolocations');
    } finally {
      setLoading(false);
    }
  };

  // Create new geo location
  const createGeoLocation = async (input: GeoLocationInput) => {
    try {
      setSubmitLoader(true);
      await graphQLClient.request(CREATE_GEOLOCATION, input);
      await fetchGeoLocations();
      setSubmitError(null);
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to create geolocation');
      throw new Error('Failed to create geolocation');
    } finally {
      setSubmitLoader(false);
    }
  };

  // Delete geo location
  const deleteGeoLocation = async (id: number) => {
    setLoading(true);
    try {
      await graphQLClient.request(DELETE_GEOLOCATION, { id });
      await fetchGeoLocations();
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete geolocation');
    } finally {
      setLoading(false);
    }
  };

  // Update geo location
  const updateGeoLocation = async (id: number, input: GeoLocationInput) => {
    try {
      setSubmitLoader(true);
      await graphQLClient.request(UPDATE_GEOLOCATION, { id, data: input });
      await fetchGeoLocations();
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
        fetchGeoLocations,
        submitLoader,
        submitError,
        geoLocations,
        loading,
        error,
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

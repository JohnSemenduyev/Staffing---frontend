// src/context/GeoLocationContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { GET_GEOLOCATIONS } from '../graphql/queries';
import { graphQLClient } from '../GraphqlClient';
import { CREATE_GEOLOCATION } from '../graphql/mutation';


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
  fetchGeoLocations: (page?: number) => Promise<void>;
  setCurrentPage: (page: number) => void;
  createGeoLocation: (input: GeoLocationInput) => Promise<void>;
}


const GeoLocationContext = createContext<GeoLocationContextType | undefined>(undefined);

export const GeoLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [geoLocations, setGeoLocations] = useState<GeoLocation[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitLoader, setSubmitLoader] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

const fetchGeoLocations = async (page: number = 1) => {
  setLoading(true);
  try {
    const data = await graphQLClient.request<{
      geoLocations: {
        data: GeoLocation[];
        lastPage: number;
      };
    }>(GET_GEOLOCATIONS, { page });

    setGeoLocations(data.geoLocations.data);
    setLastPage(data.geoLocations.lastPage);
    setCurrentPage(page);
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
      await fetchGeoLocations(currentPage); // refresh current page
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to create geolocation');
      throw new Error('Failed to create geolocation');
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
        fetchGeoLocations,
        setCurrentPage,
        createGeoLocation,
      }}
    >
      {children}
    </GeoLocationContext.Provider>
  );
};

export const useGeoLocation = () => {
  const context = useContext(GeoLocationContext);
  if (!context) {
    throw new Error('useGeoLocation must be used within a GeoLocationProvider');
  }
  return context;
};

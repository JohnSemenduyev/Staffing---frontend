/**
 * Utility functions for handling GraphQL errors
 */

export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: Record<string, any>;
}

export interface GraphQLResponse {
  data?: any;
  errors?: GraphQLError[];
}

/**
 * Checks if a GraphQL response contains errors
 * @param response - The GraphQL response object
 * @returns true if the response contains errors, false otherwise
 */
export const hasGraphQLErrors = (response: any): boolean => {
  return response?.errors && Array.isArray(response.errors) && response.errors.length > 0;
};

/**
 * Extracts the first error message from a GraphQL response
 * @param response - The GraphQL response object
 * @returns The first error message or a default message
 */
export const getFirstGraphQLError = (response: any): string => {
  if (hasGraphQLErrors(response)) {
    return response.errors[0].message || 'An unknown error occurred';
  }
  return 'An unknown error occurred';
};

/**
 * Checks if a GraphQL operation was successful (no errors in response)
 * @param response - The GraphQL response object
 * @returns true if successful, false if contains errors
 */
export const isGraphQLSuccess = (response: any): boolean => {
  return !hasGraphQLErrors(response);
};

/**
 * Handles GraphQL errors and extracts appropriate error messages
 * @param error - The error object from a GraphQL request
 * @returns A formatted error message
 */
export const handleGraphQLError = (error: any): string => {
  // Check for GraphQL errors in response
  if (error.response?.errors && error.response.errors.length > 0) {
    return error.response.errors[0].message || 'GraphQL error occurred';
  }
  
  // Check for network errors
  if (error.message) {
    if (error.message.includes("Network Error") || error.message.includes("fetch")) {
      return "Network error. Please check your internet connection and try again.";
    }
    return error.message;
  }
  
  return "An unknown error occurred";
};

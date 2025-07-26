import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { graphQLClient } from "../GraphqlClient";
import { GET_POST_ASSIGN } from "../graphql/queries";
import { CREATE_POST_ASSIGN, DELETE_POST_ASSIGN, UPDATE_POST_ASSIGN } from "../graphql/mutation";

// ---- Type Definitions ----
interface PostAssign {
  id: number;
  clientId: number;
  addressId: number;
  post: string;
  createdAt: string;
  updatedAt: string;
}

interface PostAssignInput {
  clientId: number;
  addressId: number;
  post: string;
}

interface PostAssignContextType {
  postAssigns: PostAssign[];
  currentPage: number;
  lastPage: number;
  loading: boolean;
  error: string | null;
  createPostAssign: (input: PostAssignInput) => Promise<void>;
  deletePostAssign: (id: number) => Promise<void>;
  updatePostAssign: (id: number, input: Partial<PostAssignInput>) => Promise<void>;
  fetchPostAssigns: (page?: number) => void;
  setCurrentPage: (page: number) => void;
}

const PostAssignContext = createContext<PostAssignContextType | undefined>(undefined);

export const PostAssignProvider = ({ children }: { children: ReactNode }) => {
  const [postAssigns, setPostAssigns] = useState<PostAssign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);

  const fetchPostAssigns = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphQLClient.request<{
        postAssigns: {
          data: PostAssign[];
          lastPage: number;
        };
      }>(GET_POST_ASSIGN, { page });

      setPostAssigns(data.postAssigns.data);
      setLastPage(data.postAssigns.lastPage);
      setCurrentPage(page);
    } catch (err: any) {
      console.error("Error fetching post assigns:", err);
      setError(err.message || "Failed to fetch post assigns");
    } finally {
      setLoading(false);
    }
  };

  const createPostAssign = async (input: PostAssignInput) => {
    try {
      await graphQLClient.request<{ createPostAssign: PostAssign }>(CREATE_POST_ASSIGN, input);
      await fetchPostAssigns(currentPage); // refresh current page
    } catch (err: any) {
      console.error("Error creating post assign:", err);
      setError(err.message || "Failed to create post assign");
    }
  };

  const deletePostAssign = async (id: number) => {
    try {
      await graphQLClient.request(DELETE_POST_ASSIGN, { id });
      await fetchPostAssigns(currentPage); // refresh current page
    } catch (err: any) {
      console.error("Error deleting post assign:", err);
      setError(err.message || "Failed to delete post assign");
    }
  };

  const updatePostAssign = async (id: number, input: Partial<PostAssignInput>) => {
    try {
      const variables = { id, data: input };
      await graphQLClient.request<{ updatePostAssign: PostAssign }>(UPDATE_POST_ASSIGN, variables);
      await fetchPostAssigns(currentPage); // refresh current page
    } catch (err: any) {
      console.error("Error updating post assign:", err);
      setError(err.message || "Failed to update post assign");
    }
  };

  return (
    <PostAssignContext.Provider
      value={{
        postAssigns,
        currentPage,
        lastPage,
        loading,
        error,
        createPostAssign,
        deletePostAssign,
        updatePostAssign,
        fetchPostAssigns,
        setCurrentPage,
      }}
    >
      {children}
    </PostAssignContext.Provider>
  );
};


export const usePostAssignContext = () => {
  const context = useContext(PostAssignContext);
  if (!context) {
    throw new Error("usePostAssignContext must be used within a PostAssignProvider");
  }
  return context;
};
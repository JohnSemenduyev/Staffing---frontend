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
  loading: boolean;
  error: string | null;
  createPostAssign: (input: PostAssignInput) => Promise<void>;
  deletePostAssign: (id: number) => Promise<void>;
  updatePostAssign: (id: number, input: Partial<PostAssignInput>) => Promise<void>;
  refreshPostAssigns: () => void;
}

// ---- Create Context ----
const PostAssignContext = createContext<PostAssignContextType | undefined>(undefined);

// ---- Provider Component ----
export const PostAssignProvider = ({ children }: { children: ReactNode }) => {
  const [postAssigns, setPostAssigns] = useState<PostAssign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPostAssigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphQLClient.request<{ postAssigns: PostAssign[] }>(GET_POST_ASSIGN);
      setPostAssigns(data.postAssigns);
    } catch (err: any) {
      console.error("Error fetching post assigns:", err);
      setError(err.message || "Failed to fetch post assigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostAssigns();
  }, []);

  const refreshPostAssigns = () => {
    fetchPostAssigns();
  };

  const createPostAssign = async (input: PostAssignInput) => {
    try {
      const data = await graphQLClient.request<{ createPostAssign: PostAssign }>(CREATE_POST_ASSIGN, input);
      setPostAssigns(prev => [...prev, data.createPostAssign]);
    } catch (err: any) {
      console.error("Error creating post assign:", err);
      setError(err.message || "Failed to create post assign");
    }
  };

  const deletePostAssign = async (id: number) => {
    try {
      await graphQLClient.request(DELETE_POST_ASSIGN, { id });
      setPostAssigns(prev => prev.filter(pa => pa.id !== id));
    } catch (err: any) {
      console.error("Error deleting post assign:", err);
      setError(err.message || "Failed to delete post assign");
    }
  };

  const updatePostAssign = async (id: number, input: Partial<PostAssignInput>) => {
    try {
      const variables = { id, data: input };
      const data = await graphQLClient.request<{ updatePostAssign: PostAssign }>(UPDATE_POST_ASSIGN, variables);
      setPostAssigns(prev =>
        prev.map(pa => (pa.id === id ? { ...pa, ...data.updatePostAssign } : pa))
      );
    } catch (err: any) {
      console.error("Error updating post assign:", err);
      setError(err.message || "Failed to update post assign");
    }
  };

  return (
    <PostAssignContext.Provider value={{ postAssigns, loading, error, createPostAssign, deletePostAssign, updatePostAssign, refreshPostAssigns }}>
      {children}
    </PostAssignContext.Provider>
  );
};

// ---- Custom Hook ----
export const usePostAssignContext = () => {
  const context = useContext(PostAssignContext);
  if (!context) {
    throw new Error("usePostAssignContext must be used within a PostAssignProvider");
  }
  return context;
};
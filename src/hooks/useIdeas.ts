"use client";

import { useEffect, useState } from "react";
import { IdeaDocument } from "@/types/schema";
import { subscribeToIdeas } from "@/lib/firebase/services";

export interface UseIdeasResult {
  ideas: IdeaDocument[];
  loading: boolean;
  error: Error | null;
}

export function useIdeas(workspaceId: string): UseIdeasResult {
  const [ideas, setIdeas] = useState<IdeaDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setIdeas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to Firestore onSnapshot
    const unsubscribe = subscribeToIdeas(
      workspaceId,
      (updatedIdeas) => {
        setIdeas(updatedIdeas);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    // Guaranteed unmount cleanup to avoid memory leaks
    return () => {
      unsubscribe();
    };
  }, [workspaceId]);

  return { ideas, loading, error };
}

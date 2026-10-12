"use client";

import { useEffect, useState } from "react";
import { IssueDocument } from "@/types/schema";
import { subscribeToIssues } from "@/lib/firebase/services";

export interface UseIssuesResult {
  issues: IssueDocument[];
  loading: boolean;
  error: Error | null;
}

export function useIssues(workspaceId: string, parentIdeaId?: string): UseIssuesResult {
  const [issues, setIssues] = useState<IssueDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setIssues([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to Firestore onSnapshot
    const unsubscribe = subscribeToIssues(
      workspaceId,
      (updatedIssues) => {
        setIssues(updatedIssues);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
      parentIdeaId
    );

    // Guaranteed unmount cleanup
    return () => {
      unsubscribe();
    };
  }, [workspaceId, parentIdeaId]);

  return { issues, loading, error };
}

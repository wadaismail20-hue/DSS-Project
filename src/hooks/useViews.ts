"use client";

import { useEffect, useState, useRef } from "react";
import { DiscoveryViewDefinition } from "@/types/schema";
import { subscribeToViews, seedDefaultViews } from "@/lib/firebase/services";

export interface UseViewsResult {
  views: DiscoveryViewDefinition[];
  loading: boolean;
  error: Error | null;
}

export function useViews(workspaceId: string): UseViewsResult {
  const [views, setViews] = useState<DiscoveryViewDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const hasSeededRef = useRef<boolean>(false);

  useEffect(() => {
    if (!workspaceId) {
      setViews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToViews(
      workspaceId,
      (fetchedViews) => {
        // Sort so default or "view_all_ideas" is first, then by createdAt
        const sorted = [...fetchedViews].sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return a.createdAt.localeCompare(b.createdAt);
        });
        setViews(sorted);
        setLoading(false);

        // Auto-seed default views if workspace has none yet
        if (fetchedViews.length === 0 && !hasSeededRef.current) {
          hasSeededRef.current = true;
          seedDefaultViews(workspaceId).catch((err) => {
            console.warn("Could not auto-seed default views:", err);
          });
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [workspaceId]);

  return { views, loading, error };
}

"use client";

import { useEffect, useState, useRef } from "react";
import { BoardDefinition } from "@/types/schema";
import { subscribeToBoards, seedDefaultBoards } from "@/lib/firebase/services";

export interface UseBoardsResult {
  boards: BoardDefinition[];
  loading: boolean;
  error: Error | null;
}

export function useBoards(workspaceId: string): UseBoardsResult {
  const [boards, setBoards] = useState<BoardDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const hasSeededRef = useRef<boolean>(false);

  useEffect(() => {
    if (!workspaceId) {
      setBoards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToBoards(
      workspaceId,
      (fetchedBoards) => {
        setBoards(fetchedBoards);
        setLoading(false);

        // Auto-seed default boards if workspace has none yet
        if (fetchedBoards.length === 0 && !hasSeededRef.current) {
          hasSeededRef.current = true;
          seedDefaultBoards(workspaceId).catch((err) => {
            console.warn("Could not auto-seed default boards:", err);
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

  return { boards, loading, error };
}

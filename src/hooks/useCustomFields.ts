"use client";

import { useEffect, useState, useRef } from "react";
import { CustomFieldDefinition } from "@/types/schema";
import { subscribeToCustomFields, seedDefaultCustomFields } from "@/lib/firebase/services";

export interface UseCustomFieldsResult {
  customFields: CustomFieldDefinition[];
  loading: boolean;
  error: Error | null;
}

export function useCustomFields(workspaceId: string): UseCustomFieldsResult {
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const hasSeededRef = useRef<boolean>(false);

  useEffect(() => {
    if (!workspaceId) {
      setCustomFields([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToCustomFields(
      workspaceId,
      (fields) => {
        setCustomFields(fields);
        setLoading(false);

        // Auto-seed default fields if workspace has none yet
        if (fields.length === 0 && !hasSeededRef.current) {
          hasSeededRef.current = true;
          seedDefaultCustomFields(workspaceId).catch((err) => {
            console.warn("Could not auto-seed default custom fields:", err);
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

  return { customFields, loading, error };
}

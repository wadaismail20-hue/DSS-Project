"use client";

import React, { useState } from "react";
import { seedInitialWorkspaceData } from "@/lib/firebase/services";
import { Button } from "@/components/ui/button";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SeedDatabaseModalProps {
  workspaceId: string;
}

export function SeedDatabaseButton({ workspaceId }: SeedDatabaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSeed() {
    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      await seedInitialWorkspaceData(workspaceId);
      setStatus("success");
      setMessage("Baseline documents seeded to Firestore. Real-time listeners updating UI.");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      console.error("Seed error:", err);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to seed data to Firestore.");
      setTimeout(() => setStatus("idle"), 5000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === "success" && (
        <span className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          {message}
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
          <AlertCircle className="w-3 h-3" />
          {message}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSeed}
        disabled={loading}
        className="gap-1.5 text-slate-700 hover:text-slate-900 border-slate-200"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
            Writing to Firestore...
          </>
        ) : (
          <>
            <Database className="w-3.5 h-3.5 text-slate-500" />
            Seed Schema to Firestore
          </>
        )}
      </Button>
    </div>
  );
}

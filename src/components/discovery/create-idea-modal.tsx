"use client";

import React, { useState, useEffect } from "react";
import { IdeaDocument, IdeaStatus, CustomFieldDefinition, CustomFieldValue, DiscoveryViewDefinition } from "@/types/schema";
import { createIdea, optimisticWrite } from "@/lib/firebase/services";
import { Button } from "@/components/ui/button";
import { X, Plus, Sparkles, Loader2 } from "lucide-react";

interface CreateIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  existingCount: number;
  customFields?: CustomFieldDefinition[];
  views?: DiscoveryViewDefinition[];
  activeViewId?: string;
}

export function CreateIdeaModal({
  isOpen,
  onClose,
  workspaceId,
  existingCount,
  customFields = [],
  views = [],
  activeViewId,
}: CreateIdeaModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultId = `IDEA-${String(existingCount + 1).padStart(3, "0")}`;
  const [ideaId, setIdeaId] = useState(defaultId);
  const [title, setTitle] = useState("");
  const [strategicGoal, setStrategicGoal] = useState("Revenue & Market Expansion");
  const [status, setStatus] = useState<IdeaStatus>("Prioritized");
  const [selectedViewId, setSelectedViewId] = useState<string>(activeViewId || "view_all_ideas");
  const [targetQuarter, setTargetQuarter] = useState("Q3 2026");
  const [impactScore, setImpactScore] = useState<number>(8);
  const [effortScore, setEffortScore] = useState<number>(5);
  const [authorId, setAuthorId] = useState("USER-PMO");
  const [description, setDescription] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldValue>>({});

  useEffect(() => {
    if (activeViewId) {
      setSelectedViewId(activeViewId);
    }
  }, [activeViewId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const calculatedRice = Math.round(((impactScore * 10) / (effortScore || 1)) * 10) / 10;
    const targetView = views.find((v) => v.id === selectedViewId);
    const viewContext = targetView?.filterContext || targetView?.name || "General";

    const newIdea: IdeaDocument = {
      ideaId: ideaId.trim() || defaultId,
      workspaceId,
      title: title.trim(),
      strategicGoal: strategicGoal.trim(),
      status,
      authorId: authorId.trim() || "USER-PMO",
      createdAt: new Date().toISOString(),
      viewId: selectedViewId,
      context: viewContext,
      ...(targetQuarter.trim() ? { targetQuarter: targetQuarter.trim() } : {}),
      ...(typeof impactScore === "number" && !isNaN(impactScore) ? { impactScore } : {}),
      ...(typeof effortScore === "number" && !isNaN(effortScore) ? { effortScore } : {}),
      ...(typeof calculatedRice === "number" && !isNaN(calculatedRice) ? { riceScore: calculatedRice } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(Object.keys(customFieldValues).length > 0 ? { customFields: customFieldValues } : {}),
      rollUpMetrics: {
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        progressPercentage: 0,
        totalLinkedIssues: 0,
      },
    };

    try {
      // Instant UI response via optimistic write: local cache triggers onSnapshot immediately
      await optimisticWrite(createIdea(newIdea));

      setTitle("");
      setDescription("");
      setCustomFieldValues({});
      setSubmitting(false);
      onClose();
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : "Failed to create idea in Firestore");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              New Strategic Initiative
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add a product discovery idea to the executive portfolio.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2.5">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Idea Key
              </label>
              <input
                type="text"
                value={ideaId}
                onChange={(e) => setIdeaId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none bg-slate-50 font-mono"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Strategic Goal
              </label>
              <input
                type="text"
                value={strategicGoal}
                onChange={(e) => setStrategicGoal(e.target.value)}
                placeholder="e.g. Q3 Revenue Growth"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Initiative Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cross-Enterprise Loyalty Engine"
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
              required
            />
          </div>

          {views.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                View / Context
              </label>
              <select
                value={selectedViewId}
                onChange={(e) => setSelectedViewId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-[#0052CC] focus:outline-none bg-white font-medium text-[#172B4D]"
              >
                {views.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.filterContext ? `(${v.filterContext})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Assigns this initiative to the chosen view context (e.g. IT PMO, AI Champions, Roadmap).
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IdeaStatus)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none bg-white"
              >
                <option value="Prioritized">Prioritized</option>
                <option value="In Discovery">In Discovery</option>
                <option value="Ready for Delivery">Ready for Delivery</option>
                <option value="Backlog">Backlog</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Quarter
              </label>
              <input
                type="text"
                value={targetQuarter}
                onChange={(e) => setTargetQuarter(e.target.value)}
                placeholder="e.g. Q4 2026"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Author
              </label>
              <input
                type="text"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Impact Score (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={impactScore}
                onChange={(e) => setImpactScore(Number(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Effort Score (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={effortScore}
                onChange={(e) => setEffortScore(Number(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description & Executive Rationale
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Strategic rationale, target customer segment, and success criteria..."
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
            />
          </div>

          {/* Active Custom Fields */}
          {customFields.filter((f) => f.visible).length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Space Custom Fields
              </label>
              <div className="grid grid-cols-2 gap-2.5 max-h-40 overflow-y-auto p-1">
                {customFields
                  .filter((f) => f.visible)
                  .map((field) => (
                    <div key={field.id}>
                      <label className="block text-[10px] font-medium text-slate-600 mb-0.5 truncate">
                        {field.name}
                      </label>
                      {field.type === "select" ? (
                        <select
                          value={String(customFieldValues[field.id] || "")}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value || null,
                            })
                          }
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded bg-white focus:outline-none"
                        >
                          <option value="">— Select {field.name} —</option>
                          {field.options?.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "multi-select" ? (
                        <div className="flex flex-wrap gap-1">
                          {field.options?.map((opt) => {
                            const selected = Array.isArray(customFieldValues[field.id])
                              ? (customFieldValues[field.id] as string[]).includes(opt.id)
                              : false;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  const current = Array.isArray(customFieldValues[field.id])
                                    ? [...(customFieldValues[field.id] as string[])]
                                    : [];
                                  const next = selected
                                    ? current.filter((id) => id !== opt.id)
                                    : [...current, opt.id];
                                  setCustomFieldValues({
                                    ...customFieldValues,
                                    [field.id]: next,
                                  });
                                }}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                  selected
                                    ? "bg-blue-600 text-white border-blue-600 font-medium"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : field.type === "date" ? (
                        <input
                          type="date"
                          value={String(customFieldValues[field.id] || "")}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value || null,
                            })
                          }
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none"
                        />
                      ) : field.type === "number" || field.type === "rating" ? (
                        <input
                          type="number"
                          value={
                            typeof customFieldValues[field.id] === "number"
                              ? Number(customFieldValues[field.id])
                              : ""
                          }
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none"
                        />
                      ) : field.type === "checkbox" ? (
                        field.options && field.options.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {field.options.map((opt) => {
                              const checked = Array.isArray(customFieldValues[field.id])
                                ? (customFieldValues[field.id] as string[]).includes(opt.id)
                                : false;
                              return (
                                <label
                                  key={opt.id}
                                  className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${
                                    checked
                                      ? "bg-blue-50 border-blue-200 text-blue-800 font-medium"
                                      : "bg-slate-50 border-slate-200 text-slate-600"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const current = Array.isArray(customFieldValues[field.id])
                                        ? [...(customFieldValues[field.id] as string[])]
                                        : [];
                                      const next = checked
                                        ? current.filter((id) => id !== opt.id)
                                        : [...current, opt.id];
                                      setCustomFieldValues({
                                        ...customFieldValues,
                                        [field.id]: next,
                                      });
                                    }}
                                    className="h-3 w-3 rounded text-blue-600 border-slate-300"
                                  />
                                  <span>{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center h-7">
                            <input
                              type="checkbox"
                              checked={Boolean(customFieldValues[field.id])}
                              onChange={(e) =>
                                setCustomFieldValues({
                                  ...customFieldValues,
                                  [field.id]: e.target.checked,
                                })
                              }
                              className="rounded border-slate-300 text-blue-600 h-4 w-4"
                            />
                          </div>
                        )
                      ) : field.type === "reactions" ? (
                        <div className="flex flex-wrap gap-1">
                          {(field.options && field.options.length > 0
                            ? field.options.map((o) => o.label)
                            : ["👍", "❤️", "🚀", "🎉"]
                          ).map((emoji) => {
                            const counts =
                              typeof customFieldValues[field.id] === "object" &&
                              customFieldValues[field.id] !== null &&
                              !Array.isArray(customFieldValues[field.id])
                                ? { ...(customFieldValues[field.id] as Record<string, number>) }
                                : {};
                            const count = counts[emoji] || 0;
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setCustomFieldValues({
                                    ...customFieldValues,
                                    [field.id]: {
                                      ...counts,
                                      [emoji]: count + 1,
                                    },
                                  });
                                }}
                                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100"
                              >
                                <span>{emoji}</span>
                                {count > 0 && <span className="text-[10px] font-mono font-semibold">{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={String(customFieldValues[field.id] || "")}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value || null,
                            })
                          }
                          placeholder={field.name}
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-1.5">
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving to Firestore...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Create Initiative
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

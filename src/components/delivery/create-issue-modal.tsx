"use client";

import React, { useState } from "react";
import { IssueDocument, IssueType, IssueStatus, IdeaDocument, BoardDefinition } from "@/types/schema";
import { createIssue, syncIdeaRollUpMetrics, optimisticWrite } from "@/lib/firebase/services";
import { Button } from "@/components/ui/button";
import { X, Plus, Layers, Loader2, Kanban } from "lucide-react";

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  ideas: IdeaDocument[];
  existingIssues: IssueDocument[];
  preselectedIdeaId?: string;
  boards?: BoardDefinition[];
  activeBoardId?: string;
}

export function CreateIssueModal({
  isOpen,
  onClose,
  workspaceId,
  ideas,
  existingIssues,
  preselectedIdeaId,
  boards = [],
  activeBoardId,
}: CreateIssueModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultId = `DEV-${String(existingIssues.length + 101)}`;
  const [issueId, setIssueId] = useState(defaultId);
  const [type, setType] = useState<IssueType>("Story");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<IssueStatus>("To Do");
  const [storyPoints, setStoryPoints] = useState<number>(5);
  const [parentIdeaId, setParentIdeaId] = useState<string>(
    preselectedIdeaId || (ideas.length > 0 ? ideas[0].ideaId : "IDEA-001")
  );
  const [parentEpicId, setParentEpicId] = useState<string>("");
  const [boardId, setBoardId] = useState<string>(
    activeBoardId || (boards.length > 0 ? boards[0].id : "")
  );
  const [sprintId, setSprintId] = useState<string>("SPRINT-24");
  const [assigneeId, setAssigneeId] = useState<string>("USER-42");
  const [description, setDescription] = useState("");

  // Sync parentIdeaId when preselectedIdeaId changes
  React.useEffect(() => {
    if (preselectedIdeaId) {
      setParentIdeaId(preselectedIdeaId);
    } else if (ideas.length > 0 && !parentIdeaId) {
      setParentIdeaId(ideas[0].ideaId);
    }
  }, [preselectedIdeaId, ideas, parentIdeaId]);

  // Sync boardId when activeBoardId changes
  React.useEffect(() => {
    if (activeBoardId) {
      setBoardId(activeBoardId);
    } else if (boards.length > 0 && !boardId) {
      setBoardId(boards[0].id);
    }
  }, [activeBoardId, boards, boardId]);

  if (!isOpen) return null;

  // Filter epics for parentEpicId selector
  const availableEpics = existingIssues.filter((i) => i.type === "Epic");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Issue title is required.");
      return;
    }
    if (!parentIdeaId) {
      setErrorMsg("Parent Strategic Idea is required for 100% traceability.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const newIssue: IssueDocument = {
      issueId: issueId.trim() || defaultId,
      workspaceId,
      ...(boardId.trim() ? { boardId: boardId.trim() } : {}),
      type,
      title: title.trim(),
      status,
      storyPoints: Number(storyPoints) || 0,
      parentIdeaId,
      ...(parentEpicId.trim() ? { parentEpicId: parentEpicId.trim() } : {}),
      sprintId: sprintId.trim() || "SPRINT-24",
      assigneeId: assigneeId.trim() || "Unassigned",
      updatedAt: new Date().toISOString(),
      ...(description.trim() ? { description: description.trim() } : {}),
    };

    try {
      const updatedChildIssues = [...existingIssues.filter((i) => i.parentIdeaId === parentIdeaId), newIssue];

      // Instant UI response via optimistic write: local cache triggers onSnapshot immediately
      await optimisticWrite(
        Promise.all([
          createIssue(newIssue),
          syncIdeaRollUpMetrics(parentIdeaId, updatedChildIssues),
        ]).then(() => undefined)
      );

      // Reset form & close modal immediately
      setTitle("");
      setDescription("");
      setParentEpicId("");
      setSubmitting(false);
      onClose();
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : "Failed to create issue in Firestore");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              New Agile Delivery Issue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Create an Epic, User Story, Task, or Bug linked to a strategic idea.
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
                Issue Key
              </label>
              <input
                type="text"
                value={issueId}
                onChange={(e) => setIssueId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none bg-slate-50 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as IssueType)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none bg-white font-medium"
              >
                <option value="Story">Story</option>
                <option value="Epic">Epic</option>
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Story Points
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={storyPoints}
                onChange={(e) => setStoryPoints(Number(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Issue Summary
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement resilient token refresh endpoint"
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
              required
            />
          </div>

          {/* Board Selector */}
          {boards.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Kanban className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Target Delivery Board</span>
              </label>
              <select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none bg-white font-medium"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.templateId})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Parent Strategic Idea
              </label>
              <select
                value={parentIdeaId}
                onChange={(e) => setParentIdeaId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none bg-white truncate"
                required
              >
                {ideas.length === 0 ? (
                  <option value="">No ideas available - Create an idea first</option>
                ) : (
                  ideas.map((idea) => (
                    <option key={idea.ideaId} value={idea.ideaId}>
                      {idea.ideaId}: {idea.title.slice(0, 32)}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Parent Epic (Optional)
              </label>
              <select
                value={parentEpicId}
                onChange={(e) => setParentEpicId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none bg-white"
              >
                <option value="">None (Top-level under Idea)</option>
                {availableEpics.map((epic) => (
                  <option key={epic.issueId} value={epic.issueId}>
                    {epic.issueId}: {epic.title.slice(0, 28)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IssueStatus)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none bg-white"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Sprint
              </label>
              <input
                type="text"
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                placeholder="SPRINT-24"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assignee
              </label>
              <input
                type="text"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                placeholder="USER-42"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Technical Description / Acceptance Criteria
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Engineering details, expected outputs, or API endpoints..."
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
            />
          </div>

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
                  Create Issue
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

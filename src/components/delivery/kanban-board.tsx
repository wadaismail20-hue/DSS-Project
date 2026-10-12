"use client";

import React, { useState } from "react";
import {
  IssueDocument,
  IssueStatus,
  IdeaDocument,
  BoardDefinition,
  BoardColumnDefinition,
} from "@/types/schema";
import {
  updateIssueStatus,
  deleteIssue,
  syncIdeaRollUpMetrics,
  optimisticWrite,
} from "@/lib/firebase/services";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CircleDot,
  Lightbulb,
  Sparkles,
  Rocket,
  Bookmark,
  Layers,
  Kanban as KanbanIcon,
} from "lucide-react";

interface KanbanBoardProps {
  issues: IssueDocument[];
  ideas: IdeaDocument[];
  boards?: BoardDefinition[];
  activeBoardId?: string;
  onSelectBoard?: (boardId: string) => void;
  onOpenCreateBoard?: () => void;
  onOpenCreateIssue: () => void;
}

function getColumnIcon(iconName?: string) {
  switch (iconName) {
    case "CircleDot":
      return CircleDot;
    case "Clock":
      return Clock;
    case "AlertTriangle":
      return AlertTriangle;
    case "CheckCircle2":
      return CheckCircle2;
    case "Lightbulb":
      return Lightbulb;
    case "Sparkles":
      return Sparkles;
    case "Rocket":
      return Rocket;
    case "Bookmark":
      return Bookmark;
    default:
      return CircleDot;
  }
}

const DEFAULT_COLUMNS: BoardColumnDefinition[] = [
  { id: "To Do", title: "To Do", statusMapping: "To Do", color: "text-slate-500", icon: "CircleDot" },
  { id: "In Progress", title: "In Progress", statusMapping: "In Progress", color: "text-blue-600", icon: "Clock" },
  { id: "Review", title: "Review", statusMapping: "Review", color: "text-amber-500", icon: "AlertTriangle" },
  { id: "Done", title: "Done", statusMapping: "Done", color: "text-emerald-600", icon: "CheckCircle2" },
];

export function KanbanBoard({
  issues,
  ideas,
  boards = [],
  activeBoardId,
  onSelectBoard,
  onOpenCreateBoard,
  onOpenCreateIssue,
}: KanbanBoardProps) {
  const [selectedSprint, setSelectedSprint] = useState<string>("ALL");
  const [selectedIdea, setSelectedIdea] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);

  // Determine current active board definition
  const currentBoard = boards.find((b) => b.id === activeBoardId) || boards[0];
  const activeColumns: BoardColumnDefinition[] =
    currentBoard && currentBoard.columns && currentBoard.columns.length > 0
      ? currentBoard.columns
      : DEFAULT_COLUMNS;

  // Extract distinct sprints from issues
  const distinctSprints = Array.from(new Set(issues.map((i) => i.sprintId).filter(Boolean)));

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesBoard =
      !currentBoard ||
      (issue.boardId
        ? issue.boardId === currentBoard.id
        : currentBoard.id === "board-delivery-default" || currentBoard.isDefault || boards.length <= 1);
    const matchesSprint = selectedSprint === "ALL" || issue.sprintId === selectedSprint;
    const matchesIdea = selectedIdea === "ALL" || issue.parentIdeaId === selectedIdea;
    const matchesType = selectedType === "ALL" || issue.type === selectedType;
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.issueId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.assigneeId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBoard && matchesSprint && matchesIdea && matchesType && matchesSearch;
  });

  async function handleMoveStatus(issue: IssueDocument, newStatus: IssueStatus) {
    try {
      setUpdatingIssueId(issue.issueId);
      const siblingIssues = issues
        .filter((i) => i.parentIdeaId === issue.parentIdeaId)
        .map((i) => (i.issueId === issue.issueId ? { ...i, status: newStatus } : i));

      await optimisticWrite(
        Promise.all([
          updateIssueStatus(issue.issueId, newStatus),
          syncIdeaRollUpMetrics(issue.parentIdeaId, siblingIssues),
        ]).then(() => undefined)
      );
    } catch (err) {
      console.error("Failed to move issue status:", err);
    } finally {
      setUpdatingIssueId(null);
    }
  }

  async function handleDeleteIssue(issue: IssueDocument) {
    if (confirm(`Delete issue ${issue.issueId}?`)) {
      try {
        await deleteIssue(issue.issueId);
        const remainingIssues = issues.filter(
          (i) => i.parentIdeaId === issue.parentIdeaId && i.issueId !== issue.issueId
        );
        await syncIdeaRollUpMetrics(issue.parentIdeaId, remainingIssues);
      } catch (err) {
        alert("Failed to delete issue: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  }

  function getTypeBadge(type: IssueDocument["type"]) {
    switch (type) {
      case "Epic":
        return <span className="text-[10px] font-semibold text-[#403294] bg-[#EAE6FF] px-1.5 py-0.5 rounded border border-[#D3CAFC]">EPIC</span>;
      case "Story":
        return <span className="text-[10px] font-semibold text-[#006644] bg-[#E3FCEF] px-1.5 py-0.5 rounded border border-[#ABF5D1]">STORY</span>;
      case "Task":
        return <span className="text-[10px] font-semibold text-[#0052CC] bg-[#DEEBFF] px-1.5 py-0.5 rounded border border-[#B3D4FF]">TASK</span>;
      case "Bug":
        return <span className="text-[10px] font-semibold text-[#DE350B] bg-[#FFEBE6] px-1.5 py-0.5 rounded border border-[#FFBDAD]">BUG</span>;
    }
  }

  return (
    <div className="space-y-3 flex flex-col flex-1 min-w-0">
      {/* Separated Board Selector Header */}
      {boards.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-[#FAFBFC] p-2 rounded-md border border-[#EBECF0]">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-2xl">
            <span className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider mr-1 flex items-center gap-1">
              <KanbanIcon className="w-3.5 h-3.5" />
              Boards:
            </span>
            {boards.map((b) => {
              const isActive = (currentBoard?.id || boards[0]?.id) === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectBoard && onSelectBoard(b.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[#0052CC] text-white shadow-sm font-semibold"
                      : "bg-white text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] border border-[#DFE1E6]"
                  }`}
                >
                  {b.name}
                </button>
              );
            })}

            {onOpenCreateBoard && (
              <button
                type="button"
                onClick={onOpenCreateBoard}
                className="px-2 py-1 rounded text-xs font-medium text-[#0052CC] hover:bg-[#DEEBFF] border border-dashed border-[#B3D4FF] whitespace-nowrap flex items-center gap-1 transition-colors"
                title="Create a new separated board"
              >
                <Plus className="w-3 h-3" />
                <span>New Board</span>
              </button>
            )}
          </div>

          {currentBoard && (
            <div className="text-[11px] text-[#6B778C] hidden md:flex items-center gap-2">
              <span>{currentBoard.description || currentBoard.name}</span>
              <span className="font-mono text-[10px] bg-white border border-[#DFE1E6] px-1.5 py-0.5 rounded">
                {activeColumns.length} columns
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sleek Jira Kanban Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAFBFC] p-2 rounded-md border border-[#EBECF0]">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search issues or assignees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1 bg-white border border-[#DFE1E6] rounded text-[#172B4D] placeholder-[#6B778C] focus:border-[#4C9AFF] focus:outline-none"
            />
          </div>

          {/* Sprint Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#6B778C]" />
            <select
              value={selectedSprint}
              onChange={(e) => setSelectedSprint(e.target.value)}
              className="text-xs px-2.5 py-1 border border-[#DFE1E6] rounded bg-white text-[#172B4D] focus:outline-none focus:border-[#4C9AFF]"
            >
              <option value="ALL">Sprint: All</option>
              {distinctSprints.map((sprint) => (
                <option key={sprint} value={sprint}>
                  {sprint}
                </option>
              ))}
            </select>
          </div>

          {/* Parent Idea Filter */}
          <select
            value={selectedIdea}
            onChange={(e) => setSelectedIdea(e.target.value)}
            className="text-xs px-2.5 py-1 border border-[#DFE1E6] rounded bg-white text-[#172B4D] focus:outline-none focus:border-[#4C9AFF] max-w-xs truncate"
          >
            <option value="ALL">Initiative: All</option>
            {ideas.map((idea) => (
              <option key={idea.ideaId} value={idea.ideaId}>
                {idea.ideaId}: {idea.title.slice(0, 24)}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-2.5 py-1 border border-[#DFE1E6] rounded bg-white text-[#172B4D] focus:outline-none focus:border-[#4C9AFF]"
          >
            <option value="ALL">Type: All</option>
            <option value="Story">Stories</option>
            <option value="Epic">Epics</option>
            <option value="Task">Tasks</option>
            <option value="Bug">Bugs</option>
          </select>
        </div>
      </div>

      {/* Horizontal Single-Line Kanban Columns (Strictly in ONE line, never wraps into 2 lines) */}
      <div className="flex items-start gap-4 overflow-x-auto pb-4 pt-1 w-full min-w-full scrollbar-thin">
        {activeColumns.map((col, colIndex) => {
          // An issue belongs to this column if its status matches col.statusMapping (or col.id)
          const colIssues = filteredIssues.filter(
            (i) => i.status === col.statusMapping || i.status === col.id
          );
          const colPoints = colIssues.reduce(
            (acc, curr) => acc + (typeof curr.storyPoints === "number" ? curr.storyPoints : 0),
            0
          );
          const IconComponent = getColumnIcon(col.icon);

          return (
            <div
              key={col.id}
              className="w-80 flex-shrink-0 flex flex-col bg-[#F4F5F7] rounded-lg border border-[#EBECF0] min-h-[620px] max-h-[calc(100vh-210px)] shadow-sm"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-[#EBECF0] bg-white rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className={`w-3.5 h-3.5 ${col.color || "text-[#0052CC]"}`} />
                  <span className="text-xs font-semibold text-[#172B4D] tracking-tight">
                    {col.title}
                  </span>
                  <span className="text-[11px] font-mono text-[#6B778C] bg-[#EBECF0] px-1.5 py-0.2 rounded-full font-semibold">
                    {colIssues.length}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium text-[#6B778C] tabular-nums">
                  {colPoints} pts
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto">
                {colIssues.length === 0 ? (
                  <div className="h-32 border border-dashed border-[#DFE1E6] rounded-md flex items-center justify-center text-center p-3 text-[11px] text-[#6B778C] bg-white/50">
                    No issues in {col.title}
                  </div>
                ) : (
                  colIssues.map((issue) => {
                    const parentIdea = ideas.find((i) => i.ideaId === issue.parentIdeaId);

                    return (
                      <div
                        key={issue.issueId}
                        className="bg-white rounded-md border border-[#DFE1E6] p-3 shadow-sm hover:border-[#4C9AFF] hover:shadow-md transition-all group"
                      >
                        {/* Header: Key, Type & Actions */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-1.5">
                            {getTypeBadge(issue.type)}
                            <span className="font-mono text-xs font-semibold text-[#172B4D]">
                              {issue.issueId}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleDeleteIssue(issue)}
                              className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors"
                              title="Delete issue"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-medium text-[#172B4D] leading-snug line-clamp-2 mb-2">
                          {issue.title}
                        </h4>

                        {/* Linked Parent Strategic Idea Badge */}
                        {parentIdea && (
                          <div className="mb-2 bg-[#F4F5F7] border border-[#EBECF0] rounded p-1.5 text-[10px] text-[#42526E] flex items-center gap-1.5 truncate">
                            <Lightbulb className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            <span className="font-mono text-slate-500">{parentIdea.ideaId}:</span>
                            <span className="truncate">{parentIdea.title}</span>
                          </div>
                        )}

                        {/* Footer: Sprint, Points, Assignee & Status Movement */}
                        <div className="pt-2 border-t border-[#EBECF0] flex items-center justify-between text-[11px] text-[#6B778C]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-slate-100 px-1 rounded text-slate-600">
                              {issue.sprintId}
                            </span>
                            <span className="font-mono font-medium text-slate-700 bg-blue-50 px-1 rounded text-[10px]">
                              {issue.storyPoints} pts
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Move Backward */}
                            {colIndex > 0 && (
                              <button
                                type="button"
                                disabled={updatingIssueId === issue.issueId}
                                onClick={() =>
                                  handleMoveStatus(
                                    issue,
                                    activeColumns[colIndex - 1].statusMapping
                                  )
                                }
                                className="p-1 hover:bg-[#EBECF0] rounded text-[#6B778C] hover:text-[#172B4D] disabled:opacity-40"
                                title={`Move to ${activeColumns[colIndex - 1].title}`}
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}

                            {/* Move Forward */}
                            {colIndex < activeColumns.length - 1 && (
                              <button
                                type="button"
                                disabled={updatingIssueId === issue.issueId}
                                onClick={() =>
                                  handleMoveStatus(
                                    issue,
                                    activeColumns[colIndex + 1].statusMapping
                                  )
                                }
                                className="p-1 hover:bg-[#EBECF0] rounded text-[#6B778C] hover:text-[#172B4D] disabled:opacity-40"
                                title={`Move to ${activeColumns[colIndex + 1].title}`}
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

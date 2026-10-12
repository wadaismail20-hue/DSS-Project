"use client";

import React, { useState } from "react";
import {
  IdeaDocument,
  IssueDocument,
  IdeaStatus,
  DiscoveryViewDefinition,
} from "@/types/schema";
import {
  updateIdea,
  deleteIdea,
  createIdea,
  optimisticWrite,
} from "@/lib/firebase/services";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Bookmark,
  Layers,
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
  Target,
} from "lucide-react";

interface DiscoveryBoardProps {
  ideas: IdeaDocument[];
  issues: IssueDocument[];
  views?: DiscoveryViewDefinition[];
  activeView?: DiscoveryViewDefinition;
  onOpenCreateIdea: () => void;
  onOpenCreateIssueForIdea: (ideaId: string) => void;
  workspaceId?: string;
}

interface ColumnConfig {
  id: string;
  title: string;
  color: string;
  badgeBg: string;
}

const STATUS_COLUMNS: ColumnConfig[] = [
  { id: "Backlog", title: "Backlog", color: "text-slate-600", badgeBg: "bg-slate-200 text-slate-700" },
  { id: "In Discovery", title: "In Discovery", color: "text-blue-600", badgeBg: "bg-blue-100 text-blue-700" },
  { id: "Prioritized", title: "Prioritized", color: "text-purple-600", badgeBg: "bg-purple-100 text-purple-700" },
  { id: "Ready for Delivery", title: "Ready for Delivery", color: "text-amber-600", badgeBg: "bg-amber-100 text-amber-700" },
  { id: "Delivered", title: "Delivered", color: "text-emerald-600", badgeBg: "bg-emerald-100 text-emerald-700" },
];

const ROADMAP_COLUMNS: ColumnConfig[] = [
  { id: "Now", title: "Now", color: "text-blue-600", badgeBg: "bg-blue-100 text-blue-700" },
  { id: "Next", title: "Next", color: "text-sky-600", badgeBg: "bg-sky-100 text-sky-700" },
  { id: "Later", title: "Later", color: "text-purple-600", badgeBg: "bg-purple-100 text-purple-700" },
  { id: "Unscheduled", title: "Unscheduled", color: "text-slate-600", badgeBg: "bg-slate-200 text-slate-700" },
];

export function DiscoveryBoard({
  ideas,
  issues,
  views = [],
  activeView,
  onOpenCreateIdea,
  onOpenCreateIssueForIdea,
  workspaceId = "WS-123",
}: DiscoveryBoardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [quickTitleByColumn, setQuickTitleByColumn] = useState<Record<string, string>>({});
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [activeMenuIdeaId, setActiveMenuIdeaId] = useState<string | null>(null);

  const isRoadmapGrouping = activeView?.groupBy === "roadmap";
  const columns: ColumnConfig[] = isRoadmapGrouping ? ROADMAP_COLUMNS : STATUS_COLUMNS;

  // Filter ideas by search query
  const filteredIdeas = ideas.filter((idea) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      idea.title.toLowerCase().includes(query) ||
      idea.ideaId.toLowerCase().includes(query) ||
      idea.strategicGoal.toLowerCase().includes(query)
    );
  });

  // Group ideas into columns
  const columnIdeas: Record<string, IdeaDocument[]> = {};
  columns.forEach((col) => {
    columnIdeas[col.id] = [];
  });

  filteredIdeas.forEach((idea) => {
    if (isRoadmapGrouping) {
      const rdVal = (idea.customFields?.cf_roadmap as string) || "Unscheduled";
      if (columnIdeas[rdVal]) {
        columnIdeas[rdVal].push(idea);
      } else {
        columnIdeas["Unscheduled"]?.push(idea);
      }
    } else {
      const stVal = idea.status || "Backlog";
      if (columnIdeas[stVal]) {
        columnIdeas[stVal].push(idea);
      } else {
        columnIdeas["Backlog"]?.push(idea);
      }
    }
  });

  // Move idea across columns
  async function handleMoveColumn(idea: IdeaDocument, direction: "prev" | "next") {
    const currentColId = isRoadmapGrouping
      ? (idea.customFields?.cf_roadmap as string) || "Unscheduled"
      : idea.status || "Backlog";

    const colIndex = columns.findIndex((c) => c.id === currentColId);
    if (colIndex === -1) return;

    const targetIndex = direction === "next" ? colIndex + 1 : colIndex - 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const targetCol = columns[targetIndex];

    try {
      if (isRoadmapGrouping) {
        await optimisticWrite(
          updateIdea(idea.ideaId, {
            customFields: {
              ...(idea.customFields || {}),
              cf_roadmap: targetCol.id,
            },
          })
        );
      } else {
        await optimisticWrite(
          updateIdea(idea.ideaId, {
            status: targetCol.id as IdeaStatus,
          })
        );
      }
    } catch (err) {
      console.error("Failed to move idea:", err);
    }
  }

  // Change idea's assigned view / context
  async function handleChangeViewContext(idea: IdeaDocument, targetViewId: string) {
    const targetView = views.find((v) => v.id === targetViewId);
    if (!targetView) return;

    try {
      await optimisticWrite(
        updateIdea(idea.ideaId, {
          viewId: targetView.id,
          context: targetView.filterContext || targetView.name,
        })
      );
      setActiveMenuIdeaId(null);
    } catch (err) {
      console.error("Failed to change idea view:", err);
    }
  }

  // Quick inline add idea to column
  async function handleQuickAdd(colId: string) {
    const title = quickTitleByColumn[colId]?.trim();
    if (!title) return;

    const count = ideas.length + 1;
    const newIdeaId = `IDEA-${String(count).padStart(3, "0")}`;

    const newIdea: IdeaDocument = {
      ideaId: newIdeaId,
      workspaceId,
      title,
      strategicGoal: "Continuous Innovation",
      status: isRoadmapGrouping ? "Prioritized" : (colId as IdeaStatus),
      authorId: "USER-PMO",
      createdAt: new Date().toISOString(),
      viewId: activeView?.id || "view_all_ideas",
      context: activeView?.filterContext || activeView?.name || "General",
      impactScore: 8,
      effortScore: 5,
      riceScore: 75,
      customFields: isRoadmapGrouping ? { cf_roadmap: colId } : {},
      rollUpMetrics: {
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        progressPercentage: 0,
        totalLinkedIssues: 0,
      },
    };

    try {
      await optimisticWrite(createIdea(newIdea));
      setQuickTitleByColumn((prev) => ({ ...prev, [colId]: "" }));
      setAddingToCol(null);
    } catch (err) {
      console.error("Failed to quick add idea:", err);
    }
  }

  // Delete idea
  async function handleDeleteIdea(ideaId: string) {
    if (confirm(`Are you sure you want to delete idea ${ideaId}?`)) {
      try {
        await deleteIdea(ideaId);
        setActiveMenuIdeaId(null);
      } catch (err) {
        console.error("Failed to delete idea:", err);
      }
    }
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Board Controls Toolbar */}
      <div className="flex items-center justify-between pb-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search initiatives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#DFE1E6] rounded-md focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] focus:outline-none w-56 text-[#172B4D]"
            />
          </div>
          <span className="text-xs text-[#6B778C]">
            Showing <strong className="text-[#172B4D]">{filteredIdeas.length}</strong> initiatives in{" "}
            <span className="text-[#0052CC] font-semibold">{activeView?.name || "All ideas"}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenCreateIdea}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Initiative</span>
        </button>
      </div>

      {/* SINGLE LINE HORIZONTAL KANBAN BOARD (Never wraps, never splits into 2 lines) */}
      <div className="flex flex-row flex-nowrap items-start gap-4 overflow-x-auto pb-6 w-full min-h-[560px]">
        {columns.map((col, colIdx) => {
          const ideasInCol = columnIdeas[col.id] || [];

          return (
            <div
              key={col.id}
              className="w-72 min-w-[288px] flex-shrink-0 bg-[#F4F5F7] rounded-lg p-3 flex flex-col max-h-[calc(100vh-220px)] border border-[#EBECF0]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#DFE1E6]">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    col.id === "Backlog" ? "bg-slate-400" :
                    col.id === "In Discovery" ? "bg-blue-500" :
                    col.id === "Prioritized" ? "bg-purple-500" :
                    col.id === "Ready for Delivery" ? "bg-amber-500" :
                    col.id === "Delivered" ? "bg-emerald-500" :
                    col.id === "Now" ? "bg-blue-500" :
                    col.id === "Next" ? "bg-sky-500" :
                    col.id === "Later" ? "bg-purple-500" : "bg-slate-400"
                  }`} />
                  <h3 className="text-xs font-bold text-[#172B4D] tracking-tight truncate">
                    {col.title}
                  </h3>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${col.badgeBg}`}>
                  {ideasInCol.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[120px]">
                {ideasInCol.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[#6B778C] border border-dashed border-[#DFE1E6] rounded-md bg-white/40">
                    No initiatives in {col.title}
                  </div>
                ) : (
                  ideasInCol.map((idea) => {
                    const themeVal = idea.customFields?.cf_theme as string | undefined;
                    const percent = idea.rollUpMetrics?.progressPercentage || 0;
                    const linkedCount = idea.rollUpMetrics?.totalLinkedIssues || 0;
                    const points = idea.rollUpMetrics?.totalStoryPoints || 0;
                    const menuOpen = activeMenuIdeaId === idea.ideaId;

                    return (
                      <div
                        key={idea.ideaId}
                        className="bg-white rounded-md border border-[#DFE1E6] hover:border-[#4C9AFF] shadow-xs p-3 transition-all hover:shadow-sm relative group flex flex-col gap-2"
                      >
                        {/* Top Row: ID, Context Badge, Actions */}
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-[#0052CC] bg-[#DEEBFF] px-1.5 py-0.5 rounded">
                              {idea.ideaId}
                            </span>
                            {/* Context / View Tag */}
                            {idea.context && (
                              <span className="bg-[#EAE6FF] text-[#403294] font-semibold px-1.5 py-0.5 rounded">
                                {idea.context}
                              </span>
                            )}
                          </div>

                          {/* Move Column Arrows & Menu */}
                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            {colIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveColumn(idea, "prev")}
                                className="w-5 h-5 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#6B778C] hover:text-[#172B4D]"
                                title="Move left"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {colIdx < columns.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveColumn(idea, "next")}
                                className="w-5 h-5 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#6B778C] hover:text-[#172B4D]"
                                title="Move right"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveMenuIdeaId(menuOpen ? null : idea.ideaId)}
                                className="w-5 h-5 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#6B778C] hover:text-[#172B4D]"
                                title="Actions"
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </button>

                              {/* Card Action Dropdown */}
                              {menuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#DFE1E6] rounded-md shadow-lg py-1 z-30 text-xs">
                                  <div className="px-3 py-1 text-[10px] font-bold text-[#6B778C] uppercase">
                                    Move to View
                                  </div>
                                  {views.map((v) => (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => handleChangeViewContext(idea, v.id)}
                                      className={`w-full text-left px-3 py-1.5 hover:bg-[#F4F5F7] flex items-center justify-between ${
                                        idea.viewId === v.id ? "font-semibold text-[#0052CC]" : "text-[#172B4D]"
                                      }`}
                                    >
                                      <span className="truncate">{v.name}</span>
                                      {idea.viewId === v.id && (
                                        <span className="text-[10px] text-[#0052CC]">✓</span>
                                      )}
                                    </button>
                                  ))}

                                  <div className="my-1 border-t border-[#EBECF0]" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuIdeaId(null);
                                      onOpenCreateIssueForIdea(idea.ideaId);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-[#F4F5F7] text-[#172B4D] flex items-center gap-1.5"
                                  >
                                    <Plus className="w-3 h-3 text-[#0052CC]" />
                                    <span>Add Delivery Issue</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteIdea(idea.ideaId)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-1.5"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete Initiative</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Title & Goal */}
                        <div>
                          <h4 className="text-xs font-semibold text-[#172B4D] leading-snug line-clamp-2">
                            {idea.title}
                          </h4>
                          {idea.strategicGoal && (
                            <p className="text-[11px] text-[#6B778C] mt-0.5 line-clamp-1">
                              🎯 {idea.strategicGoal}
                            </p>
                          )}
                        </div>

                        {/* Theme or Roadmap Tag if set */}
                        {themeVal && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-[#42526E] border border-slate-200 truncate max-w-full">
                              {themeVal}
                            </span>
                          </div>
                        )}

                        {/* Metrics Bar: RICE Score + Linked Issues */}
                        <div className="flex items-center justify-between text-[10px] text-[#6B778C] pt-1 border-t border-[#F4F5F7]">
                          <div className="flex items-center gap-2">
                            {typeof idea.riceScore === "number" && (
                              <span className="font-semibold text-[#172B4D] bg-[#F4F5F7] px-1.5 py-0.5 rounded">
                                RICE: {idea.riceScore}
                              </span>
                            )}
                            {typeof idea.impactScore === "number" && (
                              <span className="text-[#6B778C]">
                                Imp: {idea.impactScore}/10
                              </span>
                            )}
                          </div>

                          <span className="font-medium text-[#42526E]">
                            {linkedCount} issues · {points} pts
                          </span>
                        </div>

                        {/* Roll-Up Delivery Progress Bar */}
                        {linkedCount > 0 && (
                          <div className="space-y-1 pt-0.5">
                            <div className="flex items-center justify-between text-[9px] text-[#6B778C]">
                              <span>Progress</span>
                              <span className="font-semibold text-[#172B4D]">{Math.round(percent)}%</span>
                            </div>
                            <div className="w-full bg-[#EBECF0] h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  percent === 100
                                    ? "bg-emerald-500"
                                    : percent > 50
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Column Footer: Quick Add Idea */}
              <div className="pt-2 mt-2 border-t border-[#DFE1E6]">
                {addingToCol === col.id ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Enter initiative title..."
                      value={quickTitleByColumn[col.id] || ""}
                      onChange={(e) =>
                        setQuickTitleByColumn((prev) => ({ ...prev, [col.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleQuickAdd(col.id);
                        if (e.key === "Escape") setAddingToCol(null);
                      }}
                      autoFocus
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#0052CC] rounded focus:outline-none shadow-xs text-[#172B4D]"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(col.id)}
                        className="px-2.5 py-1 bg-[#0052CC] hover:bg-[#0065FF] text-white rounded text-[11px] font-semibold"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingToCol(null)}
                        className="px-2.5 py-1 text-[#6B778C] hover:text-[#172B4D] text-[11px] font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingToCol(col.id)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-[#6B778C] hover:text-[#172B4D] hover:bg-white/60 transition-colors font-medium text-left"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#6B778C]" />
                    <span>Create idea</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

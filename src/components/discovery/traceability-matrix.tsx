"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  IdeaDocument,
  IssueDocument,
  IssueStatus,
  CustomFieldDefinition,
  CustomFieldValue,
  DiscoveryViewDefinition,
} from "@/types/schema";
import { CustomFieldCell } from "./custom-field-cell";
import { DiscoveryBoard } from "./discovery-board";
import {
  createIdea,
  updateIdea,
  updateIssueStatus,
  deleteIdea,
  deleteIssue,
  syncIdeaRollUpMetrics,
  reorderCustomFields,
  optimisticWrite,
} from "@/lib/firebase/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Plus,
  Trash2,
  Bookmark,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderTree,
  Search,
  ExternalLink,
  SlidersHorizontal,
  Target,
  Table2,
  Kanban,
  Layers,
  Sparkles,
  Compass,
  Rocket,
  MessageSquare,
  TrendingUp,
  Share2,
  Link2,
  Lock,
  MoreHorizontal,
  Maximize2,
  Filter,
  ArrowUpDown,
  Check,
  Loader2,
} from "lucide-react";

interface TraceabilityMatrixProps {
  ideas: IdeaDocument[];
  issues: IssueDocument[];
  customFields?: CustomFieldDefinition[];
  activeView?: DiscoveryViewDefinition;
  views?: DiscoveryViewDefinition[];
  onSelectView?: (viewId: string) => void;
  onOpenCreateView?: () => void;
  onOpenCreateIdea: () => void;
  onOpenCreateIssueForIdea: (ideaId: string) => void;
  onOpenFieldsDrawer?: () => void;
  workspaceId?: string;
}

function getViewIcon(iconName?: string) {
  switch (iconName) {
    case "Target":
      return Target;
    case "Table2":
      return Table2;
    case "Kanban":
      return Kanban;
    case "Layers":
      return Layers;
    case "Sparkles":
      return Sparkles;
    case "Compass":
      return Compass;
    case "Rocket":
      return Rocket;
    default:
      return Target;
  }
}

export function TraceabilityMatrix({
  ideas,
  issues,
  customFields = [],
  activeView,
  views = [],
  onSelectView,
  onOpenCreateView,
  onOpenCreateIdea,
  onOpenCreateIssueForIdea,
  onOpenFieldsDrawer,
  workspaceId = "WS-123",
}: TraceabilityMatrixProps) {
  const [expandedIdeaIds, setExpandedIdeaIds] = useState<Set<string>>(new Set(ideas.map((i) => i.ideaId)));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [groupBy, setGroupBy] = useState<"none" | "theme" | "roadmap" | "status">(
    activeView?.groupBy || "none"
  );
  const [sortBy, setSortBy] = useState<string>("default");
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);

  // Layout mode: Table vs Board (Kanban in one line)
  const [layoutMode, setLayoutMode] = useState<"table" | "board">(
    activeView?.viewType === "board" ? "board" : "table"
  );

  useEffect(() => {
    if (activeView?.viewType === "board") {
      setLayoutMode("board");
    } else {
      setLayoutMode("table");
    }
  }, [activeView?.id, activeView?.viewType]);

  // Selection state
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<Set<string>>(new Set());

  // Inline quick create state
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineSubmitting, setInlineSubmitting] = useState(false);

  // Dropdown menus
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const groupByRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Sync groupBy with activeView
  useEffect(() => {
    if (activeView?.groupBy) {
      setGroupBy(activeView.groupBy);
    }
  }, [activeView]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (groupByRef.current && !groupByRef.current.contains(e.target as Node)) {
        setGroupByOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleCustomFields = customFields.filter((f) => f.visible);

  function toggleExpand(ideaId: string) {
    setExpandedIdeaIds((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) {
        next.delete(ideaId);
      } else {
        next.add(ideaId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedIdeaIds(new Set(ideas.map((i) => i.ideaId)));
  }

  function collapseAll() {
    setExpandedIdeaIds(new Set());
  }

  function toggleSelectIdea(ideaId: string) {
    setSelectedIdeaIds((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) next.delete(ideaId);
      else next.add(ideaId);
      return next;
    });
  }

  // Filter ideas by activeView context to separate initiatives per view
  const viewScopedIdeas = ideas.filter((idea) => {
    if (!activeView || activeView.id === "view_all_ideas") return true;
    const isContextMatch =
      idea.viewId === activeView.id ||
      idea.context?.toLowerCase() === activeView.name.toLowerCase() ||
      (activeView.filterContext && idea.context?.toLowerCase() === activeView.filterContext.toLowerCase()) ||
      (idea.viewIds && idea.viewIds.includes(activeView.id));
    const isStatusMatch = !activeView.filterStatus || idea.status === activeView.filterStatus;
    return isContextMatch && isStatusMatch;
  });

  // Filter ideas within the active view
  let filteredIdeas = viewScopedIdeas.filter((idea) => {
    const matchesSearch =
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.ideaId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.strategicGoal.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || idea.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function toggleSelectAll() {
    if (selectedIdeaIds.size === filteredIdeas.length) {
      setSelectedIdeaIds(new Set());
    } else {
      setSelectedIdeaIds(new Set(filteredIdeas.map((i) => i.ideaId)));
    }
  }

  // Sort ideas
  if (sortBy === "riceScore") {
    filteredIdeas = [...filteredIdeas].sort((a, b) => (b.riceScore || 0) - (a.riceScore || 0));
  } else if (sortBy === "impactScore") {
    filteredIdeas = [...filteredIdeas].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
  } else if (sortBy === "title") {
    filteredIdeas = [...filteredIdeas].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === "createdAt") {
    filteredIdeas = [...filteredIdeas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // Group ideas if groupBy !== "none"
  const groupedIdeas: Record<string, IdeaDocument[]> = {};
  if (groupBy === "theme") {
    filteredIdeas.forEach((idea) => {
      const themeVal = (idea.customFields?.cf_theme as string) || "No Theme";
      if (!groupedIdeas[themeVal]) groupedIdeas[themeVal] = [];
      groupedIdeas[themeVal].push(idea);
    });
  } else if (groupBy === "roadmap") {
    filteredIdeas.forEach((idea) => {
      const rdVal = (idea.customFields?.cf_roadmap as string) || "Unscheduled";
      if (!groupedIdeas[rdVal]) groupedIdeas[rdVal] = [];
      groupedIdeas[rdVal].push(idea);
    });
  } else if (groupBy === "status") {
    filteredIdeas.forEach((idea) => {
      const stVal = idea.status || "Backlog";
      if (!groupedIdeas[stVal]) groupedIdeas[stVal] = [];
      groupedIdeas[stVal].push(idea);
    });
  } else {
    groupedIdeas["ALL"] = filteredIdeas;
  }

  async function handleStatusChange(issue: IssueDocument, newStatus: IssueStatus) {
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
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingIssueId(null);
    }
  }

  async function handleShiftColumn(index: number, direction: "left" | "right") {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= visibleCustomFields.length) return;
    const reordered = [...visibleCustomFields];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await optimisticWrite(reorderCustomFields(reordered.map((f) => f.id)));
    } catch (err) {
      console.error("Failed to shift column:", err);
    }
  }

  async function handleDeleteIdea(ideaId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete strategic idea ${ideaId}?`)) {
      try {
        await deleteIdea(ideaId);
      } catch (err) {
        alert("Failed to delete idea: " + (err instanceof Error ? err.message : String(err)));
      }
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

  // Quick inline idea creation
  async function handleInlineCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!inlineTitle.trim()) return;

    setInlineSubmitting(true);
    const newId = `IDEA-${String(ideas.length + 101)}`;
    const newIdea: IdeaDocument = {
      ideaId: newId,
      workspaceId,
      title: inlineTitle.trim(),
      strategicGoal: "Continuous Discovery",
      status: "In Discovery",
      authorId: "USER-WI",
      createdAt: new Date().toISOString(),
      viewId: activeView?.id || "view_all_ideas",
      context: activeView?.filterContext || activeView?.name || "General",
      rollUpMetrics: {
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        progressPercentage: 0,
        totalLinkedIssues: 0,
      },
      customFields: {
        ...(groupBy === "theme" ? { cf_theme: "🌱 Increase revenue" } : {}),
        ...(groupBy === "roadmap" ? { cf_roadmap: "Now" } : {}),
      },
    };

    try {
      await optimisticWrite(createIdea(newIdea));
      setInlineTitle("");
      setIsCreatingInline(false);
    } catch (err) {
      console.error("Failed to create idea inline:", err);
    } finally {
      setInlineSubmitting(false);
    }
  }

  // Update an idea's assigned view / context
  async function handleUpdateIdeaViewContext(ideaId: string, targetViewId: string) {
    const targetView = views.find((v) => v.id === targetViewId);
    if (!targetView) return;
    try {
      await optimisticWrite(
        updateIdea(ideaId, {
          viewId: targetView.id,
          context: targetView.filterContext || targetView.name,
        })
      );
    } catch (err) {
      console.error("Failed to update idea view:", err);
    }
  }

  // Update custom field on idea directly
  async function handleUpdateIdeaCustomField(
    ideaId: string,
    fieldKey: string,
    value: CustomFieldValue
  ) {
    const targetIdea = ideas.find((i) => i.ideaId === ideaId);
    if (!targetIdea) return;
    const updatedCustomFields: Record<string, CustomFieldValue> = {
      ...(targetIdea.customFields || {}),
      [fieldKey]: value,
    };
    try {
      await optimisticWrite(updateIdea(ideaId, { customFields: updatedCustomFields }));
    } catch (err) {
      console.error("Failed to update idea custom field:", err);
    }
  }

  function getTypeBadge(type: IssueDocument["type"]) {
    switch (type) {
      case "Epic":
        return <Badge className="bg-[#EAE6FF] text-[#403294] border-[#D3CAFC] text-[10px] font-semibold">Epic</Badge>;
      case "Story":
        return <Badge className="bg-[#E3FCEF] text-[#006644] border-[#ABF5D1] text-[10px] font-semibold">Story</Badge>;
      case "Task":
        return <Badge className="bg-[#DEEBFF] text-[#0052CC] border-[#B3D4FF] text-[10px] font-semibold">Task</Badge>;
      case "Bug":
        return <Badge className="bg-[#FFEBE6] text-[#DE350B] border-[#FFBDAD] text-[10px] font-semibold">Bug</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
    }
  }

  function getStatusBadge(status: IssueStatus | string) {
    switch (status) {
      case "Done":
      case "Delivered":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006644] bg-[#E3FCEF] px-2 py-0.5 rounded border border-[#ABF5D1]">
            <CheckCircle2 className="w-3 h-3 text-[#006644]" />
            {status}
          </span>
        );
      case "In Progress":
      case "In Discovery":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0052CC] bg-[#DEEBFF] px-2 py-0.5 rounded border border-[#B3D4FF]">
            <Clock className="w-3 h-3 text-[#0052CC]" />
            {status}
          </span>
        );
      case "Review":
      case "Under Review":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#974F00] bg-[#FFF0B3] px-2 py-0.5 rounded border border-[#FFE380]">
            <AlertTriangle className="w-3 h-3 text-[#974F00]" />
            {status}
          </span>
        );
      case "Prioritized":
      case "Ready for Delivery":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#403294] bg-[#EAE6FF] px-2 py-0.5 rounded border border-[#D3CAFC]">
            <Bookmark className="w-3 h-3 text-[#403294]" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#42526E] bg-[#F4F5F7] px-2 py-0.5 rounded border border-[#DFE1E6]">
            {status}
          </span>
        );
    }
  }

  const ViewIcon = getViewIcon(activeView?.icon);
  const viewTitle = activeView?.name || "All ideas";
  const viewDescription = activeView?.description || "All ideas in the product backlog. Jira Product Discovery master view.";

  return (
    <div className="space-y-3 flex-1 flex flex-col min-w-0">
      {/* 0. JIRA PRODUCT DISCOVERY VIEWS SELECTOR TABS */}
      {views.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#EBECF0]">
          {views.map((v) => {
            const isCurrent = activeView?.id === v.id;
            const VIcon = getViewIcon(v.icon);
            const viewCount = ideas.filter((i) => {
              if (v.id === "view_all_ideas") return true;
              return (
                i.viewId === v.id ||
                i.context?.toLowerCase() === v.name.toLowerCase() ||
                (v.filterContext && i.context?.toLowerCase() === v.filterContext.toLowerCase()) ||
                (i.viewIds && i.viewIds.includes(v.id))
              );
            }).length;

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectView && onSelectView(v.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                  isCurrent
                    ? "border-[#0052CC] text-[#0052CC] font-semibold bg-[#FAFBFC]"
                    : "border-transparent text-[#6B778C] hover:text-[#172B4D] hover:bg-[#F4F5F7]"
                }`}
              >
                <VIcon className="w-3.5 h-3.5" />
                <span>{v.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isCurrent ? "bg-[#DEEBFF] text-[#0052CC]" : "bg-slate-200/70 text-[#6B778C]"
                  }`}
                >
                  {viewCount}
                </span>
              </button>
            );
          })}

          {onOpenCreateView && (
            <button
              type="button"
              onClick={onOpenCreateView}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-[#0052CC] hover:bg-[#DEEBFF] transition-colors whitespace-nowrap ml-1"
              title="Create new view for another context"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create view</span>
            </button>
          )}
        </div>
      )}

      {/* 1. JIRA PRODUCT DISCOVERY VIEW TITLE HEADER */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-[#EBECF0]">
        {/* Left: View Icon, Name, Count pill, and Description */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <div className="w-6 h-6 rounded flex items-center justify-center text-[#0052CC]">
            <ViewIcon className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-[#172B4D] tracking-tight whitespace-nowrap">
            {viewTitle}
          </h1>
          <span className="text-[11px] font-medium text-[#42526E] bg-[#EBECF0] px-2 py-0.5 rounded-full whitespace-nowrap">
            {filteredIdeas.length} ideas
          </span>
          <div className="hidden md:flex items-center gap-1 text-xs text-[#6B778C] truncate max-w-md">
            <span className="text-[#A5ADBA]">≡</span>
            <span className="truncate">{viewDescription}</span>
          </div>
        </div>

        {/* Right utility buttons (Avatar WI, Comments, Share, Link, Lock, Options, Fullscreen) */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Wada Ismail Avatar Pill */}
          <div
            className="w-7 h-7 rounded-full bg-[#403294] text-white flex items-center justify-center font-bold text-[11px] shadow-xs cursor-pointer hover:ring-2 hover:ring-purple-200 transition-all"
            title="Wada Ismail (PT. DSS)"
          >
            WI
          </div>
          <button
            type="button"
            className="w-7 h-7 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#42526E] transition-colors"
            title="Comments & discussions"
          >
            <MessageSquare className="w-4 h-4 text-[#6B778C]" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[#EBECF0] text-xs font-medium text-[#42526E] transition-colors"
            title="Share this view"
          >
            <Share2 className="w-3.5 h-3.5 text-[#6B778C]" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            type="button"
            className="w-7 h-7 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#42526E] transition-colors"
            title="Copy view link"
          >
            <Link2 className="w-3.5 h-3.5 text-[#6B778C]" />
          </button>
          <button
            type="button"
            className="w-7 h-7 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#42526E] transition-colors"
            title="View permissions"
          >
            <Lock className="w-3.5 h-3.5 text-[#6B778C]" />
          </button>
          <button
            type="button"
            className="w-7 h-7 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#42526E] transition-colors"
            title="More actions"
          >
            <MoreHorizontal className="w-4 h-4 text-[#6B778C]" />
          </button>
          <button
            type="button"
            onClick={expandAll}
            className="w-7 h-7 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#42526E] transition-colors"
            title="Expand all initiatives"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#6B778C]" />
          </button>
        </div>
      </div>

      {/* 2. JIRA PRODUCT DISCOVERY ACTION TOOLBAR */}
      <div className="flex items-center justify-between gap-3 bg-[#FAFBFC] p-2 rounded-md border border-[#EBECF0] flex-wrap">
        {/* Left Toolbar Actions: Create, Group by, Filter, Sort, Fields */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary Blue Create Button */}
          <Button
            type="button"
            size="sm"
            onClick={onOpenCreateIdea}
            className="bg-[#0052CC] hover:bg-[#0065FF] text-white font-semibold text-xs h-8 px-3 shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </Button>

          {/* Group by Button with Dropdown */}
          <div className="relative" ref={groupByRef}>
            <button
              type="button"
              onClick={() => setGroupByOpen(!groupByOpen)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                groupBy !== "none"
                  ? "bg-[#E9F2FF] border-[#B3D4FF] text-[#0052CC] font-semibold"
                  : "bg-white border-[#DFE1E6] text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]"
              }`}
            >
              <span>Group by</span>
              {groupBy !== "none" ? (
                <span className="font-bold uppercase text-[10px] text-[#0052CC]">({groupBy})</span>
              ) : (
                <Plus className="w-3 h-3 text-[#6B778C]" />
              )}
            </button>

            {groupByOpen && (
              <div className="absolute left-0 mt-1 w-48 bg-white border border-[#DFE1E6] rounded-md shadow-lg py-1 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                  Group Ideas By
                </div>
                {[
                  { id: "none", label: "No grouping" },
                  { id: "theme", label: "Theme" },
                  { id: "roadmap", label: "Roadmap (Now / Next / Later)" },
                  { id: "status", label: "Status" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setGroupBy(item.id as "none" | "theme" | "roadmap" | "status");
                      setGroupByOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#EBECF0] transition-colors ${
                      groupBy === item.id ? "text-[#0052CC] font-semibold bg-[#E9F2FF]" : "text-[#172B4D]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {groupBy === item.id && <Check className="w-3.5 h-3.5 text-[#0052CC]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Button with Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                statusFilter !== "ALL"
                  ? "bg-[#E9F2FF] border-[#B3D4FF] text-[#0052CC] font-semibold"
                  : "bg-white border-[#DFE1E6] text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]"
              }`}
            >
              <Filter className="w-3 h-3 text-[#6B778C]" />
              <span>Filter</span>
              {statusFilter !== "ALL" && (
                <span className="font-bold text-[10px] text-[#0052CC]">({statusFilter})</span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-[#DFE1E6] rounded-md shadow-lg py-1 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                  Filter by Status
                </div>
                {["ALL", "Prioritized", "In Discovery", "Ready for Delivery", "Delivered", "Backlog"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setFilterOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#EBECF0] transition-colors ${
                      statusFilter === st ? "text-[#0052CC] font-semibold bg-[#E9F2FF]" : "text-[#172B4D]"
                    }`}
                  >
                    <span>{st === "ALL" ? "All statuses" : st}</span>
                    {statusFilter === st && <Check className="w-3.5 h-3.5 text-[#0052CC]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Button with Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                sortBy !== "default"
                  ? "bg-[#E9F2FF] border-[#B3D4FF] text-[#0052CC] font-semibold"
                  : "bg-white border-[#DFE1E6] text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]"
              }`}
            >
              <ArrowUpDown className="w-3 h-3 text-[#6B778C]" />
              <span>Sort</span>
            </button>

            {sortOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-[#DFE1E6] rounded-md shadow-lg py-1 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                  Sort Ideas By
                </div>
                {[
                  { id: "default", label: "Default order" },
                  { id: "riceScore", label: "RICE Score (Highest)" },
                  { id: "impactScore", label: "Impact Score" },
                  { id: "title", label: "Title (A-Z)" },
                  { id: "createdAt", label: "Recently added" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSortBy(item.id);
                      setSortOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#EBECF0] transition-colors ${
                      sortBy === item.id ? "text-[#0052CC] font-semibold bg-[#E9F2FF]" : "text-[#172B4D]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {sortBy === item.id && <Check className="w-3.5 h-3.5 text-[#0052CC]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fields Configuration Button */}
          {onOpenFieldsDrawer && (
            <button
              type="button"
              onClick={onOpenFieldsDrawer}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-white border border-[#DFE1E6] text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D] transition-colors"
              title="Configure view fields"
            >
              <span>Fields</span>
              <span className="bg-[#DEEBFF] text-[#0052CC] text-[10px] font-bold px-1.5 py-0.2 rounded font-mono">
                {visibleCustomFields.length}
              </span>
              <SlidersHorizontal className="w-3 h-3 text-[#6B778C] ml-0.5" />
            </button>
          )}

          {/* Layout Mode Switcher: Table vs Board (Single Line Kanban) */}
          <div className="flex items-center bg-[#EBECF0] p-0.5 rounded border border-[#DFE1E6]">
            <button
              type="button"
              onClick={() => setLayoutMode("table")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                layoutMode === "table"
                  ? "bg-white text-[#0052CC] shadow-xs"
                  : "text-[#6B778C] hover:text-[#172B4D]"
              }`}
              title="View as Spreadsheet Matrix"
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("board")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                layoutMode === "board"
                  ? "bg-white text-[#0052CC] shadow-xs"
                  : "text-[#6B778C] hover:text-[#172B4D]"
              }`}
              title="View as Initiatives Kanban Board"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>
        </div>

        {/* Right Search Input: 'Find an idea in this view' */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Find an idea in this view"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-[#DFE1E6] rounded text-[#172B4D] placeholder-[#6B778C] focus:border-[#0052CC] focus:outline-none"
          />
        </div>
      </div>

      {/* 3. MAIN CONTENT: DISCOVERY BOARD OR SPREADSHEET TABLE */}
      {layoutMode === "board" ? (
        <DiscoveryBoard
          ideas={viewScopedIdeas}
          issues={issues}
          views={views}
          activeView={activeView}
          onOpenCreateIdea={onOpenCreateIdea}
          onOpenCreateIssueForIdea={onOpenCreateIssueForIdea}
          workspaceId={workspaceId}
        />
      ) : (
        <div className="bg-white border border-[#DFE1E6] rounded-lg overflow-hidden shadow-xs flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DFE1E6] bg-[#FAFBFC] text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wider select-none">
                {/* Checkbox select column */}
                <th className="py-2.5 pl-3 pr-2 w-9">
                  <input
                    type="checkbox"
                    checked={filteredIdeas.length > 0 && selectedIdeaIds.size === filteredIdeas.length}
                    onChange={toggleSelectAll}
                    className="rounded border-[#DFE1E6] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                  />
                </th>

                {/* Summary column with inline '+' button */}
                <th className="py-2.5 px-3 min-w-[280px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-[#6B778C]">Aa</span>
                      <span>Summary</span>
                    </span>
                    {onOpenFieldsDrawer && (
                      <button
                        type="button"
                        onClick={onOpenFieldsDrawer}
                        className="w-5 h-5 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#6B778C] hover:text-[#0052CC] transition-colors"
                        title="Add field to view"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>

                {/* Standard JPD columns: Comments, Insights, Theme, Roadmap */}
                <th className="py-2.5 px-3 w-28 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-[#6B778C]" />
                    <span>Comments</span>
                  </div>
                </th>

                <th className="py-2.5 px-3 w-28 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#6B778C]" />
                    <span>Insights</span>
                  </div>
                </th>

                <th className="py-2.5 px-3 min-w-[150px] whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-[#6B778C]" />
                    <span>Theme</span>
                  </div>
                </th>

                <th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-[#6B778C]" />
                    <span>Roadmap</span>
                  </div>
                </th>

                {/* Additional Dynamic Custom Field Columns with Reorganize controls */}
                {visibleCustomFields
                  .filter((f) => !["cf_theme", "cf_roadmap", "cf_insights", "cf_comments"].includes(f.id))
                  .map((field, index) => (
                    <th key={field.id} className="py-2.5 px-3 whitespace-nowrap min-w-[130px] group/col">
                      <div className="flex items-center justify-between gap-1.5">
                        <span>{field.name}</span>
                        <div className="flex items-center opacity-0 group-hover/col:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleShiftColumn(index, "left")}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                            title="Move column left"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === visibleCustomFields.length - 1}
                            onClick={() => handleShiftColumn(index, "right")}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                            title="Move column right"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}

                {/* Traceability Roll-up & Actions */}
                <th className="py-2.5 px-3 w-48 whitespace-nowrap">Delivery Roll-Up</th>
                <th className="py-2.5 pr-4 pl-2 text-right w-20">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EBECF0] text-xs">
              {filteredIdeas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#6B778C]">
                    <FolderTree className="w-8 h-8 mx-auto mb-2 text-[#C1C7D0]" />
                    <p className="text-sm font-semibold text-[#172B4D]">No ideas in this view</p>
                    <p className="text-xs text-[#6B778C] mt-1">
                      Click &ldquo;Create&rdquo; or use the inline quick create row below to add an idea.
                    </p>
                  </td>
                </tr>
              ) : (
                Object.entries(groupedIdeas).map(([groupKey, groupItemList]) => {
                  return (
                    <React.Fragment key={groupKey}>
                      {/* Optional Group Header row if groupBy is enabled */}
                      {groupBy !== "none" && (
                        <tr className="bg-[#F4F5F7] border-y border-[#DFE1E6]">
                          <td colSpan={10} className="py-2 px-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#172B4D]">
                              <ChevronDown className="w-3.5 h-3.5 text-[#6B778C]" />
                              <span>{groupKey}</span>
                              <span className="text-[10px] font-mono text-[#6B778C] bg-white px-2 py-0.2 rounded-full border border-[#DFE1E6]">
                                {groupItemList.length}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}

                      {groupItemList.map((idea) => {
                        const linkedIssues = issues.filter((i) => i.parentIdeaId === idea.ideaId);
                        const isExpanded = expandedIdeaIds.has(idea.ideaId);
                        const isSelected = selectedIdeaIds.has(idea.ideaId);

                        // Extract standard custom field values
                        const themeVal = (idea.customFields?.cf_theme as string) || "";
                        const roadmapVal = (idea.customFields?.cf_roadmap as string) || "";
                        const insightsVal = (idea.customFields?.cf_insights as number) || 0;
                        const commentsVal = (idea.customFields?.cf_comments as number) || 0;

                        // Calculate live roll-up
                        const totalPts = linkedIssues.reduce(
                          (acc, curr) => acc + (typeof curr.storyPoints === "number" ? curr.storyPoints : 0),
                          0
                        );
                        const completedPts = linkedIssues
                          .filter((i) => i.status === "Done")
                          .reduce((acc, curr) => acc + (typeof curr.storyPoints === "number" ? curr.storyPoints : 0), 0);

                        const progressPct =
                          totalPts > 0
                            ? Math.round((completedPts / totalPts) * 1000) / 10
                            : linkedIssues.length > 0
                            ? Math.round(
                                (linkedIssues.filter((i) => i.status === "Done").length / linkedIssues.length) * 1000
                              ) / 10
                            : 0;

                        return (
                          <React.Fragment key={idea.ideaId}>
                            <tr
                              className={`hover:bg-[#F4F5F7]/70 transition-colors group ${
                                isSelected ? "bg-[#E9F2FF]/50" : ""
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-2 pl-3 pr-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectIdea(idea.ideaId)}
                                  className="rounded border-[#DFE1E6] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                                />
                              </td>

                              {/* Summary Title, Key & Context View Tag */}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(idea.ideaId)}
                                    className="p-0.5 rounded hover:bg-[#EBECF0] text-[#6B778C] hover:text-[#172B4D] transition-colors"
                                    title={isExpanded ? "Collapse delivery issues" : "Expand delivery issues"}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <span className="font-mono text-[10px] font-bold text-[#0052CC] bg-[#DEEBFF] px-1.5 py-0.5 rounded">
                                    {idea.ideaId}
                                  </span>
                                  <span className="font-medium text-[#172B4D] hover:text-[#0052CC] cursor-pointer">
                                    {idea.title}
                                  </span>

                                  {/* Context View Pill with quick reassign dropdown */}
                                  {idea.context && (
                                    <div className="relative group/ctx inline-flex items-center ml-1">
                                      <span
                                        className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#EAE6FF] text-[#403294] border border-[#D3CAFC] hover:bg-[#D3CAFC] transition-colors cursor-pointer"
                                        title="Initiative view context (click to reassign)"
                                      >
                                        {idea.context}
                                      </span>
                                      {views.length > 1 && (
                                        <select
                                          value={idea.viewId || ""}
                                          onChange={(e) => handleUpdateIdeaViewContext(idea.ideaId, e.target.value)}
                                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                          title="Reassign initiative to another view"
                                        >
                                          {views.map((v) => (
                                            <option key={v.id} value={v.id}>
                                              Move to: {v.name}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Comments Cell */}
                              <td className="py-2 px-3">
                                <span className="text-[#6B778C] font-mono flex items-center gap-1 hover:text-[#172B4D] cursor-pointer">
                                  <MessageSquare className="w-3 h-3 text-[#A5ADBA]" />
                                  <span>{commentsVal > 0 ? commentsVal : "+"}</span>
                                </span>
                              </td>

                              {/* Insights Cell */}
                              <td className="py-2 px-3">
                                <span className="font-semibold text-[#172B4D] flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5 text-[#0052CC]" />
                                  <span>{insightsVal > 0 ? insightsVal : ""}</span>
                                </span>
                              </td>

                              {/* Theme Pill Cell */}
                              <td className="py-2 px-3">
                                <div className="relative group/theme">
                                  {themeVal ? (
                                    <span
                                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border cursor-pointer ${
                                        themeVal.includes("revenue")
                                          ? "bg-[#E3FCEF] text-[#006644] border-[#ABF5D1]"
                                          : themeVal.includes("users") || themeVal.includes("Delight")
                                          ? "bg-[#FFEBE6] text-[#DE350B] border-[#FFBDAD]"
                                          : "bg-[#EAE6FF] text-[#403294] border-[#D3CAFC]"
                                      }`}
                                    >
                                      {themeVal}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-[#A5ADBA] group-hover/theme:text-[#6B778C] cursor-pointer">
                                      + Add theme
                                    </span>
                                  )}
                                  {/* Quick Theme Selector Dropdown on click/hover */}
                                  <select
                                    value={themeVal}
                                    onChange={(e) =>
                                      handleUpdateIdeaCustomField(idea.ideaId, "cf_theme", e.target.value)
                                    }
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  >
                                    <option value="">None</option>
                                    <option value="🌱 Increase revenue">🌱 Increase revenue</option>
                                    <option value="❤️ Delight users">❤️ Delight users</option>
                                    <option value="🚀 Expand horizons">🚀 Expand horizons</option>
                                  </select>
                                </div>
                              </td>

                              {/* Roadmap Pill Cell */}
                              <td className="py-2 px-3">
                                <div className="relative group/rd">
                                  {roadmapVal ? (
                                    <span
                                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border cursor-pointer ${
                                        roadmapVal === "Now"
                                          ? "bg-[#DEEBFF] text-[#0052CC] border-[#B3D4FF]"
                                          : roadmapVal === "Next"
                                          ? "bg-[#E6FCFF] text-[#008DA6] border-[#B3F5FF]"
                                          : "bg-[#EAE6FF] text-[#5243AA] border-[#D3CAFC]"
                                      }`}
                                    >
                                      {roadmapVal}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-[#A5ADBA] group-hover/rd:text-[#6B778C] cursor-pointer">
                                      + Roadmap
                                    </span>
                                  )}
                                  <select
                                    value={roadmapVal}
                                    onChange={(e) =>
                                      handleUpdateIdeaCustomField(idea.ideaId, "cf_roadmap", e.target.value)
                                    }
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  >
                                    <option value="">None</option>
                                    <option value="Now">Now</option>
                                    <option value="Next">Next</option>
                                    <option value="Later">Later</option>
                                  </select>
                                </div>
                              </td>

                              {/* Dynamic Custom Fields */}
                              {visibleCustomFields
                                .filter((f) => !["cf_theme", "cf_roadmap", "cf_insights", "cf_comments"].includes(f.id))
                                .map((field) => (
                                  <td key={field.id} className="py-2 px-3">
                                    <CustomFieldCell
                                      ideaId={idea.ideaId}
                                      field={field}
                                      value={idea.customFields?.[field.id]}
                                    />
                                  </td>
                                ))}

                              {/* Delivery Roll-Up Progress */}
                              <td className="py-2 px-3">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-[#6B778C]">
                                    <span>
                                      {completedPts}/{totalPts} pts
                                    </span>
                                    <span className="font-semibold text-[#172B4D]">{progressPct}%</span>
                                  </div>
                                  <div className="w-full bg-[#EBECF0] h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${
                                        progressPct === 100
                                          ? "bg-emerald-500"
                                          : progressPct > 0
                                          ? "bg-[#0052CC]"
                                          : "bg-slate-300"
                                      }`}
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-2 pr-4 pl-2 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => onOpenCreateIssueForIdea(idea.ideaId)}
                                    className="p-1 rounded hover:bg-[#DEEBFF] text-[#0052CC] transition-colors"
                                    title="Add delivery issue"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteIdea(idea.ideaId, e)}
                                    className="p-1 rounded hover:bg-[#FFEBE6] text-[#DE350B] transition-colors"
                                    title="Delete idea"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Sub-Rows: Linked Delivery Issues for 100% Traceability */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={10} className="bg-[#FAFBFC] p-0 border-b border-[#EBECF0]">
                                  <div className="py-2.5 px-8 space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#42526E]">
                                      <span className="flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-[#0052CC]" />
                                        <span>Linked Delivery Issues ({linkedIssues.length})</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => onOpenCreateIssueForIdea(idea.ideaId)}
                                        className="inline-flex items-center gap-1 text-[11px] text-[#0052CC] hover:underline"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add delivery task</span>
                                      </button>
                                    </div>

                                    {linkedIssues.length === 0 ? (
                                      <div className="py-2 text-[11px] text-[#6B778C] italic">
                                        No delivery tasks linked yet. Click &ldquo;Add delivery task&rdquo; to connect engineering work items.
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        {linkedIssues.map((issue) => (
                                          <div
                                            key={issue.issueId}
                                            className="flex items-center justify-between p-2 bg-white rounded border border-[#DFE1E6] text-xs hover:border-[#4C9AFF] transition-colors"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              {getTypeBadge(issue.type)}
                                              <span className="font-mono text-[#6B778C] text-[11px]">
                                                {issue.issueId}
                                              </span>
                                              <span className="text-[#172B4D] font-medium truncate">
                                                {issue.title}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-3 flex-shrink-0">
                                              <select
                                                value={issue.status}
                                                disabled={updatingIssueId === issue.issueId}
                                                onChange={(e) =>
                                                  handleStatusChange(issue, e.target.value as IssueStatus)
                                                }
                                                className="text-[11px] px-2 py-0.5 rounded border border-[#DFE1E6] bg-white text-[#172B4D] focus:outline-none focus:border-[#4C9AFF]"
                                              >
                                                <option value="To Do">To Do</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Review">Review</option>
                                                <option value="Done">Done</option>
                                              </select>

                                              <span className="text-[11px] font-mono text-[#6B778C]">
                                                {issue.storyPoints} pts
                                              </span>

                                              <button
                                                type="button"
                                                onClick={() => handleDeleteIssue(issue)}
                                                className="p-1 text-[#6B778C] hover:text-[#DE350B] transition-colors"
                                                title="Delete issue"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}

              {/* 4. INLINE QUICK CREATE ROW (AT THE BOTTOM OF THE TABLE) */}
              <tr>
                <td colSpan={10} className="p-0 border-t border-[#DFE1E6]">
                  {isCreatingInline ? (
                    <form
                      onSubmit={handleInlineCreate}
                      className="flex items-center gap-2 p-2 bg-[#F4F5F7]"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        placeholder="What needs to be explored? Press Enter to save..."
                        className="flex-1 text-xs px-3 py-1.5 bg-white border border-[#0052CC] rounded focus:outline-none font-medium text-[#172B4D]"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={inlineSubmitting || !inlineTitle.trim()}
                        className="bg-[#0052CC] hover:bg-[#0065FF] text-white text-xs h-7 px-2.5"
                      >
                        {inlineSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsCreatingInline(false);
                          setInlineTitle("");
                        }}
                        className="text-xs h-7 px-2 text-[#42526E]"
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreatingInline(true)}
                      className="w-full flex items-center gap-2 py-2 px-3 text-xs font-semibold text-[#0052CC] hover:bg-[#EBECF0]/60 transition-colors text-left"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create</span>
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import {
  Table2,
  Kanban,
  BarChart3,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Settings,
  Compass,
  Building2,
  CheckCircle2,
  Plus,
  Target,
  Sparkles,
  Rocket,
  Layers,
} from "lucide-react";
import { DiscoveryViewDefinition, IdeaDocument } from "@/types/schema";

export type NavTab = "discovery" | "metrics";

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

interface JiraSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  ideasCount: number;
  ideas?: IdeaDocument[];
  fieldsCount: number;
  onOpenFieldsDrawer: () => void;
  workspaceId: string;
  onWorkspaceChange: (ws: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  views?: DiscoveryViewDefinition[];
  activeViewId?: string;
  onSelectView?: (viewId: string) => void;
  onOpenCreateView?: () => void;
}

export function JiraSidebar({
  activeTab,
  onTabChange,
  ideasCount,
  ideas = [],
  fieldsCount,
  onOpenFieldsDrawer,
  workspaceId,
  onWorkspaceChange,
  isCollapsed,
  onToggleCollapse,
  views = [],
  activeViewId,
  onSelectView,
  onOpenCreateView,
}: JiraSidebarProps) {
  return (
    <aside
      className={`relative bg-[#FAFBFC] border-r border-[#EBECF0] transition-all duration-200 flex flex-col z-20 flex-shrink-0 select-none ${
        isCollapsed ? "w-14" : "w-60"
      }`}
    >
      {/* Space / Project Identity Header */}
      <div className="h-14 px-3 flex items-center gap-2.5 border-b border-[#EBECF0]">
        <div className="w-8 h-8 rounded-md bg-[#0052CC] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
          <Compass className="w-4 h-4 text-white" />
        </div>

        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold text-[#172B4D] truncate leading-tight">
              DSS Product Discovery
            </h2>
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-[#6B778C]" />
              <select
                value={workspaceId}
                onChange={(e) => onWorkspaceChange(e.target.value)}
                className="text-[10px] text-[#6B778C] hover:text-[#172B4D] bg-transparent border-none p-0 focus:outline-none cursor-pointer truncate"
              >
                <option value="WS-123">WS-123 (Primary)</option>
                <option value="WS-CORP">WS-CORP (Enterprise)</option>
                <option value="WS-DIGITAL">WS-DIGITAL (Digital)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* SECTION: VIEWS (Jira Product Discovery Context Views) */}
        <div>
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                Views
              </span>
              {onOpenCreateView && (
                <button
                  type="button"
                  onClick={onOpenCreateView}
                  className="w-4 h-4 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#6B778C] hover:text-[#0052CC] transition-colors"
                  title="Create new view per context"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <nav className="space-y-0.5">
            {views.length > 0 ? (
              views.map((v) => {
                const isCurrent = activeTab === "discovery" && activeViewId === v.id;
                const ViewIcon = getViewIcon(v.icon);

                // Calculate exact number of initiatives in this view
                const viewCount =
                  v.id === "view_all_ideas"
                    ? ideasCount
                    : ideas.filter((i) => {
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
                    onClick={() => {
                      onTabChange("discovery");
                      if (onSelectView) onSelectView(v.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left group ${
                      isCurrent
                        ? "bg-[#E9F2FF] text-[#0052CC] font-semibold"
                        : "text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]"
                    }`}
                    title={v.description || v.name}
                  >
                    <ViewIcon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isCurrent ? "text-[#0052CC]" : "text-[#6B778C] group-hover:text-[#172B4D]"
                      }`}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate">{v.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isCurrent
                              ? "bg-[#DEEBFF] text-[#0052CC]"
                              : "bg-slate-200/70 text-[#6B778C]"
                          }`}
                        >
                          {viewCount}
                        </span>
                      </>
                    )}
                  </button>
                );
              })
            ) : (
              <button
                type="button"
                onClick={() => onTabChange("discovery")}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left group ${
                  activeTab === "discovery"
                    ? "bg-[#E9F2FF] text-[#0052CC] font-semibold"
                    : "text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]"
                }`}
                title="All ideas"
              >
                <Target
                  className={`w-4 h-4 flex-shrink-0 ${
                    activeTab === "discovery" ? "text-[#0052CC]" : "text-[#6B778C] group-hover:text-[#172B4D]"
                  }`}
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">All ideas</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeTab === "discovery"
                          ? "bg-[#DEEBFF] text-[#0052CC]"
                          : "bg-slate-200/70 text-[#6B778C]"
                      }`}
                    >
                      {ideasCount}
                    </span>
                  </>
                )}
              </button>
            )}

            {!isCollapsed && onOpenCreateView && (
              <button
                type="button"
                onClick={onOpenCreateView}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium text-[#0052CC] hover:bg-[#DEEBFF] transition-colors text-left mt-1"
                title="Create a new view for another context"
              >
                <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Create view</span>
              </button>
            )}
          </nav>
        </div>

        {/* SECTION: PORTFOLIO ROLL-UP */}
        <div>
          {!isCollapsed && (
            <div className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider px-2 mb-1">
              Portfolio
            </div>
          )}
          <nav className="space-y-0.5">
            <button
              type="button"
              onClick={() => onTabChange("metrics")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left group ${
                activeTab === "metrics"
                  ? "bg-[#E9F2FF] text-[#0052CC] font-semibold"
                  : "text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]"
              }`}
              title="Executive KPIs & Analytics"
            >
              <BarChart3
                className={`w-4 h-4 flex-shrink-0 ${
                  activeTab === "metrics" ? "text-[#0052CC]" : "text-[#6B778C] group-hover:text-[#172B4D]"
                }`}
              />
              {!isCollapsed && <span className="flex-1 truncate">Executive Metrics</span>}
            </button>
          </nav>
        </div>

        {/* SECTION: SPACE CONFIGURATION */}
        <div>
          {!isCollapsed && (
            <div className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider px-2 mb-1">
              Configuration
            </div>
          )}
          <nav className="space-y-0.5">
            <button
              type="button"
              onClick={onOpenFieldsDrawer}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D] transition-colors text-left group"
              title="Configure Fields"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#6B778C] flex-shrink-0 group-hover:text-[#172B4D]" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">Fields & Properties</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200/70 text-[#6B778C]">
                    {fieldsCount}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenFieldsDrawer}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D] transition-colors text-left group"
              title="Space Settings"
            >
              <Settings className="w-4 h-4 text-[#6B778C] flex-shrink-0 group-hover:text-[#172B4D]" />
              {!isCollapsed && <span className="flex-1 truncate">Space Settings</span>}
            </button>
          </nav>
        </div>
      </div>

      {/* Collapse / Expand Toggle Button on Border */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-white border border-[#DFE1E6] shadow-sm flex items-center justify-center text-[#6B778C] hover:text-[#172B4D] hover:bg-slate-50 transition-colors z-30"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Bottom Status Indicator */}
      <div className="p-3 border-t border-[#EBECF0] text-[11px] text-[#6B778C] flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        {!isCollapsed && <span className="truncate">Atlassian Cloud 2026</span>}
      </div>
    </aside>
  );
}

"use client";

import React, { useState } from "react";
import { Header, ActiveTab } from "@/components/navigation/header";
import { JiraSidebar, NavTab } from "@/components/navigation/sidebar";
import { KpiBar } from "@/components/shared/kpi-bar";
import { TraceabilityMatrix } from "@/components/discovery/traceability-matrix";
import { CreateIdeaModal } from "@/components/discovery/create-idea-modal";
import { CreateIssueModal } from "@/components/delivery/create-issue-modal";
import { CreateViewModal } from "@/components/discovery/create-view-modal";
import { useIdeas } from "@/hooks/useIdeas";
import { useIssues } from "@/hooks/useIssues";
import { useCustomFields } from "@/hooks/useCustomFields";
import { useViews } from "@/hooks/useViews";
import { FieldsDrawer } from "@/components/discovery/fields-drawer";
import { CreateCustomFieldModal } from "@/components/discovery/create-custom-field-modal";
import {
  Table2,
  Kanban,
  BarChart3,
  SlidersHorizontal,
  ChevronRight,
  AlertCircle,
  Plus,
  Compass,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const [workspaceId, setWorkspaceId] = useState<string>("WS-123");
  const [activeTab, setActiveTab] = useState<NavTab>("discovery");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [createIdeaOpen, setCreateIdeaOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [createViewModalOpen, setCreateViewModalOpen] = useState(false);
  const [fieldsDrawerOpen, setFieldsDrawerOpen] = useState(false);
  const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
  const [preselectedIdeaId, setPreselectedIdeaId] = useState<string | undefined>(undefined);
  const [activeViewId, setActiveViewId] = useState<string>("view_all_ideas");

  // Live Firestore Real-Time onSnapshot subscriptions
  const { ideas, loading: ideasLoading, error: ideasError } = useIdeas(workspaceId);
  const { issues, loading: issuesLoading, error: issuesError } = useIssues(workspaceId);
  const { customFields, loading: fieldsLoading } = useCustomFields(workspaceId);
  const { views, loading: viewsLoading } = useViews(workspaceId);

  // Keep activeViewId synced with available views
  React.useEffect(() => {
    if (views.length > 0 && !views.some((v) => v.id === activeViewId)) {
      setActiveViewId(views[0].id);
    }
  }, [views, activeViewId]);

  const activeView = views.find((v) => v.id === activeViewId) || views[0];

  const isLoading = ideasLoading || issuesLoading || fieldsLoading || viewsLoading;
  const anyError = ideasError || issuesError;

  function handleOpenCreateIssueForIdea(ideaId: string) {
    setPreselectedIdeaId(ideaId);
    setCreateIssueOpen(true);
  }

  function handleOpenGenericCreateIssue() {
    setPreselectedIdeaId(undefined);
    setCreateIssueOpen(true);
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Top Jira Global Navigation Bar (48px) */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        workspaceId={workspaceId}
        onWorkspaceChange={setWorkspaceId}
        onOpenCreateIdea={() => setCreateIdeaOpen(true)}
        onOpenCreateIssue={handleOpenGenericCreateIssue}
        onOpenCreateView={() => setCreateViewModalOpen(true)}
        isLoading={isLoading}
      />

      {/* Main Container: Collapsible Sidebar + Content Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Jira Left Sidebar (Context Views + Space Settings) */}
        <JiraSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ideasCount={ideas.length}
          ideas={ideas}
          fieldsCount={customFields.length}
          onOpenFieldsDrawer={() => setFieldsDrawerOpen(true)}
          workspaceId={workspaceId}
          onWorkspaceChange={setWorkspaceId}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          views={views}
          activeViewId={activeViewId}
          onSelectView={setActiveViewId}
          onOpenCreateView={() => setCreateViewModalOpen(true)}
        />

        {/* Center Workspace Canvas */}
        <main className="flex-1 overflow-y-auto bg-white flex flex-col min-w-0">
          {/* Breadcrumb Bar */}
          <div className="px-6 pt-3 pb-1 flex items-center justify-between text-[11px] text-[#6B778C] border-b border-[#F4F5F7]">
            <div className="flex items-center gap-1.5">
              <span>Spaces</span>
              <ChevronRight className="w-3 h-3 text-[#6B778C]" />
              <span className="text-[#172B4D] font-medium flex items-center gap-1">
                <span>📝</span>
                <span>DSS Product Discovery</span>
              </span>
              <ChevronRight className="w-3 h-3 text-[#6B778C]" />
              <span className="text-[#0052CC] font-semibold">
                {activeTab === "discovery"
                  ? (activeView?.name || "All ideas")
                  : "Executive Portfolio Metrics"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#DEEBFF] text-[#0052CC] border border-[#B3D4FF]">
                {workspaceId}
              </span>
              <button
                type="button"
                className="text-[#6B778C] hover:text-[#172B4D] text-[11px] font-medium transition-colors hidden sm:block"
              >
                Feedback
              </button>
            </div>
          </div>

          {/* View Body Content */}
          <div className="px-6 py-4 flex-1 flex flex-col min-h-0">
            {anyError && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  Firestore Listener Notice: {anyError.message}. Ensure your Firebase project credentials are set in .env.local.
                </span>
              </div>
            )}

            {/* VIEW 1: DISCOVERY VIEWS (TABLE MATRIX OR BOARD PER CONTEXT) */}
            {activeTab === "discovery" && (
              <TraceabilityMatrix
                ideas={ideas}
                issues={issues}
                customFields={customFields}
                activeView={activeView}
                views={views}
                onSelectView={setActiveViewId}
                onOpenCreateView={() => setCreateViewModalOpen(true)}
                onOpenCreateIdea={() => setCreateIdeaOpen(true)}
                onOpenCreateIssueForIdea={handleOpenCreateIssueForIdea}
                onOpenFieldsDrawer={() => setFieldsDrawerOpen(true)}
                workspaceId={workspaceId}
              />
            )}

            {/* VIEW 2: EXECUTIVE PORTFOLIO ANALYTICS */}
            {activeTab === "metrics" && (
              <div className="space-y-6">
                <KpiBar ideas={ideas} issues={issues} />

                {/* Portfolio Health Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white border border-[#DFE1E6] rounded-lg shadow-sm">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#172B4D] mb-3">
                      <span>Initiatives by Status</span>
                      <Compass className="w-4 h-4 text-[#0052CC]" />
                    </div>
                    <div className="space-y-2 text-xs">
                      {["Prioritized", "In Discovery", "Ready for Delivery", "Delivered", "Backlog"].map((st) => {
                        const count = ideas.filter((i) => i.status === st).length;
                        const pct = ideas.length > 0 ? Math.round((count / ideas.length) * 100) : 0;
                        return (
                          <div key={st} className="flex items-center justify-between">
                            <span className="text-[#6B778C]">{st}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#172B4D]">{count}</span>
                              <span className="text-[10px] text-[#6B778C]">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-[#DFE1E6] rounded-lg shadow-sm">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#172B4D] mb-3">
                      <span>Delivery Issues Breakdown</span>
                      <Layers className="w-4 h-4 text-[#0052CC]" />
                    </div>
                    <div className="space-y-2 text-xs">
                      {["Epic", "Story", "Task", "Bug"].map((tp) => {
                        const count = issues.filter((i) => i.type === tp).length;
                        return (
                          <div key={tp} className="flex items-center justify-between">
                            <span className="text-[#6B778C]">{tp}</span>
                            <span className="font-semibold text-[#172B4D]">{count} items</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-[#DFE1E6] rounded-lg shadow-sm">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#172B4D] mb-3">
                      <span>Velocity & Execution</span>
                      <Clock className="w-4 h-4 text-[#0052CC]" />
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B778C]">Total Estimated Points</span>
                        <span className="font-semibold text-[#172B4D]">
                          {issues.reduce((acc, curr) => acc + (curr.storyPoints || 0), 0)} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B778C]">Completed Points</span>
                        <span className="font-semibold text-emerald-600">
                          {issues.filter((i) => i.status === "Done").reduce((acc, curr) => acc + (curr.storyPoints || 0), 0)} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B778C]">In Progress Points</span>
                        <span className="font-semibold text-blue-600">
                          {issues.filter((i) => i.status === "In Progress").reduce((acc, curr) => acc + (curr.storyPoints || 0), 0)} pts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals & Drawers */}
      <CreateIdeaModal
        isOpen={createIdeaOpen}
        onClose={() => setCreateIdeaOpen(false)}
        workspaceId={workspaceId}
        existingCount={ideas.length}
        customFields={customFields}
        views={views}
        activeViewId={activeViewId}
      />

      <CreateIssueModal
        isOpen={createIssueOpen}
        onClose={() => setCreateIssueOpen(false)}
        workspaceId={workspaceId}
        ideas={ideas}
        existingIssues={issues}
        preselectedIdeaId={preselectedIdeaId}
      />

      <FieldsDrawer
        isOpen={fieldsDrawerOpen}
        onClose={() => setFieldsDrawerOpen(false)}
        customFields={customFields}
        onOpenCreateField={() => {
          setFieldsDrawerOpen(false);
          setCreateFieldModalOpen(true);
        }}
      />

      <CreateCustomFieldModal
        isOpen={createFieldModalOpen}
        onClose={() => setCreateFieldModalOpen(false)}
        workspaceId={workspaceId}
        existingCount={customFields.length}
      />

      <CreateViewModal
        isOpen={createViewModalOpen}
        onClose={() => setCreateViewModalOpen(false)}
        workspaceId={workspaceId}
        onViewCreated={(newViewId) => {
          setActiveViewId(newViewId);
          setActiveTab("discovery");
        }}
      />
    </div>
  );
}

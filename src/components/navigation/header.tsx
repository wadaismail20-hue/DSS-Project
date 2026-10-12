"use client";

import React, { useState, useRef, useEffect } from "react";
import { SeedDatabaseButton } from "@/components/shared/seed-database-modal";
import {
  Search,
  Bell,
  HelpCircle,
  Settings,
  ChevronDown,
  Lightbulb,
  Layers,
  Radio,
  Grid,
} from "lucide-react";

export type ActiveTab = "discovery" | "metrics";

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  workspaceId: string;
  onWorkspaceChange: (ws: string) => void;
  onOpenCreateIdea: () => void;
  onOpenCreateIssue?: () => void;
  onOpenCreateView?: () => void;
  isLoading: boolean;
}

export function Header({
  activeTab,
  onTabChange,
  workspaceId,
  onWorkspaceChange,
  onOpenCreateIdea,
  onOpenCreateIssue,
  onOpenCreateView,
  isLoading,
}: HeaderProps) {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-12 border-b border-[#EBECF0] bg-white sticky top-0 z-40 flex items-center justify-between px-3 text-xs select-none">
      {/* Left: App Switcher, Logo & Top-level Menus */}
      <div className="flex items-center gap-1.5" ref={menuRef}>
        {/* App Switcher (9 dots) */}
        <button
          type="button"
          className="w-8 h-8 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#42526E] transition-colors"
          title="App switcher"
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* DSS Product Discovery Logo & Brand */}
        <div className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-[#EBECF0] cursor-pointer mr-1">
          <div className="w-5 h-5 rounded bg-[#0052CC] flex items-center justify-center text-white font-bold text-[9px] tracking-tight shadow-xs">
            DSS
          </div>
          <span className="font-bold text-sm text-[#172B4D] tracking-tight">
            DSS <span className="font-semibold text-[#0052CC]">Product Discovery</span>
          </span>
        </div>

        {/* Atlassian Top Navigation Menus */}
        <div className="hidden md:flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onTabChange("discovery")}
            className={`px-2.5 py-1.5 rounded hover:bg-[#EBECF0] flex items-center gap-1 text-xs font-medium transition-colors ${
              activeTab === "discovery" ? "text-[#0052CC] font-semibold" : "text-[#42526E]"
            }`}
          >
            <span>Discovery Views</span>
            <ChevronDown className="w-3 h-3 text-[#6B778C]" />
          </button>

          <button
            type="button"
            onClick={() => onTabChange("metrics")}
            className={`px-2.5 py-1.5 rounded hover:bg-[#EBECF0] flex items-center gap-1 text-xs font-medium transition-colors ${
              activeTab === "metrics" ? "text-[#0052CC] font-semibold" : "text-[#42526E]"
            }`}
          >
            <span>Portfolio Dashboards</span>
            <ChevronDown className="w-3 h-3 text-[#6B778C]" />
          </button>
        </div>

        {/* Famous Blue "Create" Button */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setCreateMenuOpen(!createMenuOpen)}
            className="bg-[#0052CC] hover:bg-[#0065FF] active:bg-[#0747A6] text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Create</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {createMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-[#DFE1E6] rounded-md shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setCreateMenuOpen(false);
                  onOpenCreateIdea();
                }}
                className="w-full px-3 py-2 text-xs text-left hover:bg-[#F4F5F7] flex items-center gap-2.5 text-[#172B4D] group"
              >
                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium">Strategic Initiative</div>
                  <div className="text-[10px] text-[#6B778C]">Discovery portfolio idea</div>
                </div>
              </button>

              {onOpenCreateView && (
                <button
                  type="button"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    onOpenCreateView();
                  }}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-[#F4F5F7] flex items-center gap-2.5 text-[#172B4D] group border-t border-slate-100"
                >
                  <div className="w-5 h-5 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium">Discovery View</div>
                    <div className="text-[10px] text-[#6B778C]">New context board or list</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Jira Global Search Bar */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search Jira..."
            className="w-full text-xs pl-8 pr-7 py-1 bg-[#FAFBFC] hover:bg-[#EBECF0] focus:bg-white border border-[#DFE1E6] focus:border-[#4C9AFF] rounded text-[#172B4D] placeholder-[#6B778C] focus:outline-none transition-colors"
          />
          <kbd className="absolute right-2 top-1.5 text-[10px] font-mono text-[#6B778C] bg-white border border-[#DFE1E6] px-1 rounded">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Actions, Live Connection & Profile */}
      <div className="flex items-center gap-1.5">
        {/* Firestore Live status pill */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-[#42526E] bg-slate-50 border border-slate-200/80 mr-1"
          title={isLoading ? "Syncing changes..." : "Connected to live Firestore"}
        >
          <Radio
            className={`w-3 h-3 ${
              isLoading ? "text-amber-500 animate-pulse" : "text-emerald-500"
            }`}
          />
          <span className="font-medium hidden md:inline">
            {isLoading ? "Syncing..." : "Live"}
          </span>
        </div>

        {/* Seed database shortcut */}
        <SeedDatabaseButton workspaceId={workspaceId} />

        {/* Notification Bell */}
        <button
          type="button"
          className="w-7 h-7 rounded-full hover:bg-[#EBECF0] flex items-center justify-center text-[#42526E] transition-colors"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
        </button>

        {/* Help */}
        <button
          type="button"
          className="w-7 h-7 rounded-full hover:bg-[#EBECF0] flex items-center justify-center text-[#42526E] transition-colors"
          title="Help & Documentation"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Settings */}
        <button
          type="button"
          className="w-7 h-7 rounded-full hover:bg-[#EBECF0] flex items-center justify-center text-[#42526E] transition-colors"
          title="Jira settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* User Profile Avatar */}
        <div
          className="w-7 h-7 rounded-full bg-[#0052CC] text-white flex items-center justify-center font-bold text-[11px] ml-1 cursor-pointer hover:ring-2 hover:ring-[#4C9AFF] transition-all"
          title="Current User: Product Owner (Enterprise)"
        >
          WI
        </div>
      </div>
    </header>
  );
}

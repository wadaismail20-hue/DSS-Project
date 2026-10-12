"use client";

import React from "react";
import { IdeaDocument, IssueDocument } from "@/types/schema";
import { Compass, CheckCircle2, Layers, TrendingUp } from "lucide-react";

interface KpiBarProps {
  ideas: IdeaDocument[];
  issues: IssueDocument[];
}

export function KpiBar({ ideas, issues }: KpiBarProps) {
  const totalIdeas = ideas.length;
  const totalIssues = issues.length;

  let totalStoryPoints = 0;
  let completedStoryPoints = 0;

  for (const issue of issues) {
    const pts = typeof issue.storyPoints === "number" && !isNaN(issue.storyPoints) ? issue.storyPoints : 0;
    totalStoryPoints += pts;
    if (issue.status === "Done") {
      completedStoryPoints += pts;
    }
  }

  const completionPct =
    totalStoryPoints > 0
      ? Math.round((completedStoryPoints / totalStoryPoints) * 1000) / 10
      : totalIssues > 0
      ? Math.round((issues.filter((i) => i.status === "Done").length / totalIssues) * 1000) / 10
      : 0;

  const inProgressIssues = issues.filter((i) => i.status === "In Progress").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Strategic Initiatives</span>
          <Compass className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {totalIdeas}
          </span>
          <span className="text-xs text-slate-500 font-normal">Active Ideas</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Delivery Work Items</span>
          <Layers className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {totalIssues}
          </span>
          <span className="text-xs text-blue-600 font-medium">{inProgressIssues} In Progress</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Story Points Delivered</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {completedStoryPoints}
          </span>
          <span className="text-xs text-slate-500">/ {totalStoryPoints} pts</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Portfolio Execution</span>
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {completionPct}%
          </span>
          <span className="text-xs text-slate-500">Roll-up Completed</span>
        </div>
      </div>
    </div>
  );
}

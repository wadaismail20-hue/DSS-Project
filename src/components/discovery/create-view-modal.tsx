"use client";

import React, { useState } from "react";
import { DiscoveryViewDefinition, DiscoveryViewType } from "@/types/schema";
import { createView, optimisticWrite } from "@/lib/firebase/services";
import { Button } from "@/components/ui/button";
import {
  X,
  Table2,
  Kanban,
  Target,
  Sparkles,
  Layers,
  Compass,
  Rocket,
  Check,
  Loader2,
  HelpCircle,
} from "lucide-react";

interface CreateViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onViewCreated?: (viewId: string) => void;
}

const VIEW_ICONS = [
  { id: "Target", label: "Goal", icon: Target },
  { id: "Table2", label: "List", icon: Table2 },
  { id: "Kanban", label: "Board", icon: Kanban },
  { id: "Layers", label: "PMO", icon: Layers },
  { id: "Sparkles", label: "AI", icon: Sparkles },
  { id: "Compass", label: "Roadmap", icon: Compass },
  { id: "Rocket", label: "Launch", icon: Rocket },
];

export function CreateViewModal({
  isOpen,
  onClose,
  workspaceId,
  onViewCreated,
}: CreateViewModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [viewType, setViewType] = useState<DiscoveryViewType>("list");
  const [selectedIcon, setSelectedIcon] = useState<string>("Target");
  const [groupBy, setGroupBy] = useState<"none" | "status" | "theme" | "roadmap">("none");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("View name is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const viewId = `view_${name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 24)}_${Date.now().toString().slice(-4)}`;

    const newView: DiscoveryViewDefinition = {
      id: viewId,
      workspaceId,
      name: name.trim(),
      description: description.trim() || undefined,
      viewType,
      icon: selectedIcon,
      groupBy,
      createdAt: new Date().toISOString(),
    };

    try {
      await optimisticWrite(createView(newView));
      setSubmitting(false);
      setName("");
      setDescription("");
      if (onViewCreated) onViewCreated(viewId);
      onClose();
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-[#DFE1E6] w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EBECF0] flex items-center justify-between bg-[#FAFBFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#0052CC] text-white flex items-center justify-center shadow-xs">
              <Table2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172B4D] tracking-tight">Create Discovery View</h2>
              <p className="text-[11px] text-[#6B778C]">
                Make a dedicated view per context with custom layout, fields, and grouping
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-[#EBECF0] flex items-center justify-center text-[#6B778C] hover:text-[#172B4D] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2.5">
              {errorMsg}
            </div>
          )}

          {/* View Name & Suggestions */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              View Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IT PMO Board, AI Champions, Q4 Roadmap"
              className="w-full text-xs px-3 py-2 border border-[#DFE1E6] rounded focus:border-[#0052CC] focus:outline-none bg-white font-medium text-[#172B4D]"
              required
            />
            {/* Quick Context Suggestions */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-[#6B778C]">Context presets:</span>
              {[
                { title: "IT PMO View", icon: "Layers", type: "board" as const },
                { title: "AI Champions", icon: "Sparkles", type: "board" as const },
                { title: "Roadmap (Now / Next / Later)", icon: "Compass", type: "board" as const, group: "roadmap" as const },
                { title: "Executive Prioritization", icon: "Target", type: "list" as const },
              ].map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setName(preset.title);
                    setSelectedIcon(preset.icon);
                    setViewType(preset.type);
                    if (preset.group) setGroupBy(preset.group);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#42526E] border border-[#DFE1E6] transition-colors font-medium"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Context */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Context Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Ideas tracked for IT PMO governance and review"
              className="w-full text-xs px-3 py-1.5 border border-[#DFE1E6] rounded focus:border-[#0052CC] focus:outline-none bg-white text-[#172B4D]"
            />
          </div>

          {/* Choose Layout Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Choose View Layout
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  id: "list" as const,
                  title: "List View",
                  desc: "Spreadsheet table with customizable columns & inline editing",
                  icon: Table2,
                },
                {
                  id: "board" as const,
                  title: "Board View",
                  desc: "Kanban cards grouped by columns in one continuous line",
                  icon: Kanban,
                },
                {
                  id: "matrix" as const,
                  title: "Matrix View",
                  desc: "Strategic 2x2 prioritization matrix (Impact vs Effort)",
                  icon: Target,
                },
              ].map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = viewType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setViewType(opt.id)}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? "border-[#0052CC] bg-[#E9F2FF] shadow-xs"
                        : "border-[#DFE1E6] bg-white hover:border-[#B3D4FF] hover:bg-[#FAFBFC]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <IconComponent
                          className={`w-4 h-4 ${isSelected ? "text-[#0052CC]" : "text-[#6B778C]"}`}
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#0052CC]" />}
                      </div>
                      <div className="text-xs font-semibold text-[#172B4D]">{opt.title}</div>
                      <div className="text-[10px] text-[#6B778C] mt-0.5 leading-snug">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group By Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Group Ideas By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "none" | "status" | "theme" | "roadmap")}
              className="w-full text-xs px-2.5 py-1.5 border border-[#DFE1E6] rounded bg-white text-[#172B4D] focus:border-[#0052CC] focus:outline-none"
            >
              <option value="none">No grouping (Flat list)</option>
              <option value="theme">Theme (🌱 Increase revenue, ❤️ Delight users, 🚀 Expand horizons)</option>
              <option value="roadmap">Roadmap (Now, Next, Later)</option>
              <option value="status">Status (Prioritized, In Discovery, Delivered, Backlog)</option>
            </select>
          </div>

          {/* Choose Icon */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              View Icon
            </label>
            <div className="flex items-center gap-2">
              {VIEW_ICONS.map((ic) => {
                const IconCmp = ic.icon;
                const isSelected = selectedIcon === ic.id;
                return (
                  <button
                    key={ic.id}
                    type="button"
                    onClick={() => setSelectedIcon(ic.id)}
                    title={ic.label}
                    className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-[#0052CC] text-white shadow-xs"
                        : "bg-[#F4F5F7] text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]"
                    }`}
                  >
                    <IconCmp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#EBECF0] flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs text-[#42526E]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !name.trim()}
              className="text-xs bg-[#0052CC] hover:bg-[#0065FF] text-white shadow-xs flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Create View</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

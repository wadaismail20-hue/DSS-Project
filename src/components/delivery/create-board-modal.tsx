"use client";

import React, { useState } from "react";
import { BoardDefinition, BoardTemplateId, BOARD_TEMPLATES } from "@/types/schema";
import { createBoard, optimisticWrite } from "@/lib/firebase/services";
import { Button } from "@/components/ui/button";
import { X, Kanban, Check, Sparkles, Loader2, ArrowRight } from "lucide-react";

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onBoardCreated?: (boardId: string) => void;
}

export function CreateBoardModal({
  isOpen,
  onClose,
  workspaceId,
  onBoardCreated,
}: CreateBoardModalProps) {
  const [boardName, setBoardName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<BoardTemplateId>("it-pmo");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeTemplate = BOARD_TEMPLATES.find((t) => t.id === selectedTemplateId) || BOARD_TEMPLATES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!boardName.trim()) {
      setErrorMsg("Board name is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const boardId = `board_${boardName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 24)}_${Date.now().toString().slice(-4)}`;

    const newBoard: BoardDefinition = {
      id: boardId,
      workspaceId,
      name: boardName.trim(),
      description: description.trim() || undefined,
      templateId: selectedTemplateId,
      columns: activeTemplate.columns,
      createdAt: new Date().toISOString(),
    };

    try {
      await optimisticWrite(createBoard(newBoard));
      setSubmitting(false);
      setBoardName("");
      setDescription("");
      if (onBoardCreated) onBoardCreated(boardId);
      onClose();
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : "Failed to create board.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg border border-[#DFE1E6] shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EBECF0]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#DEEBFF] text-[#0052CC] flex items-center justify-center">
              <Kanban className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-[#172B4D] tracking-tight">
              Create Separated Delivery Board
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6B778C] hover:text-[#172B4D] rounded p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Board Name */}
          <div>
            <label className="block text-[11px] font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
              Board Name
            </label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="e.g. IT PMO Board, AI Champions Board, Digital Ventures..."
              className="w-full text-xs px-2.5 py-1.5 border border-[#DFE1E6] rounded focus:border-[#4C9AFF] focus:outline-none"
              required
              autoFocus
            />
            {/* Quick suggested names */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-[#6B778C]">Presets:</span>
              {["IT PMO Board", "AI Champions Board", "Platform Engineering"].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setBoardName(name);
                    if (name.includes("PMO")) setSelectedTemplateId("it-pmo");
                    if (name.includes("AI")) setSelectedTemplateId("ai-champions");
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope or objectives for this board..."
              className="w-full text-xs px-2.5 py-1.5 border border-[#DFE1E6] rounded focus:border-[#4C9AFF] focus:outline-none"
            />
          </div>

          {/* Choose Board Template */}
          <div className="space-y-2 pt-2 border-t border-[#EBECF0]">
            <div>
              <label className="block text-[11px] font-semibold text-[#172B4D] uppercase tracking-wider">
                Choose Board Template & Workflow
              </label>
              <p className="text-[11px] text-[#6B778C]">
                Select the column workflow that fits your team&apos;s delivery process.
              </p>
            </div>

            <div className="space-y-2">
              {BOARD_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#EBF3FC] border-[#0052CC] shadow-sm"
                        : "bg-white border-[#DFE1E6] hover:bg-[#F4F5F7]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#172B4D]">
                          {tmpl.name}
                        </span>
                        {tmpl.id === "it-pmo" && (
                          <span className="text-[9px] font-bold text-[#0052CC] bg-[#DEEBFF] px-1.5 py-0.2 rounded">
                            GOVERNANCE
                          </span>
                        )}
                        {tmpl.id === "ai-champions" && (
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                            AI INNOVATION
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? "bg-[#0052CC] border-[#0052CC] text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-[11px] text-[#6B778C] mb-2">{tmpl.description}</p>

                    {/* Columns Preview in Single Line */}
                    <div className="flex items-center gap-1 overflow-x-auto py-1">
                      {tmpl.columns.map((c, i) => (
                        <React.Fragment key={c.id}>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-[#DFE1E6] text-[#42526E] whitespace-nowrap">
                            {c.title}
                          </span>
                          {i < tmpl.columns.length - 1 && (
                            <ArrowRight className="w-2.5 h-2.5 text-slate-300 flex-shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5 bg-[#0052CC] hover:bg-[#0065FF] text-white text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating Board...
                </>
              ) : (
                "Create Board"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

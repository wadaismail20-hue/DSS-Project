"use client";

import React, { useState } from "react";
import { CustomFieldDefinition, CustomFieldType, CustomFieldOption } from "@/types/schema";
import { createCustomField, optimisticWrite } from "@/lib/firebase/services";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  X,
  CheckSquare,
  Calendar,
  Link as LinkIcon,
  ListFilter,
  Hash,
  User,
  Star,
  Smile,
  ChevronDown,
  Type,
  Sliders,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";

interface CreateCustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  existingCount: number;
}

const FIELD_TYPES: {
  type: CustomFieldType;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Checklist items or single true/false toggle" },
  { type: "date", label: "Date", icon: Calendar, description: "Calendar date picker (e.g. Start development, End date)" },
  { type: "hyperlink", label: "Hyperlink", icon: LinkIcon, description: "External URL link to specs, Figma, or PRD" },
  { type: "multi-select", label: "Multi-select", icon: ListFilter, description: "Multiple tags from a defined list" },
  { type: "number", label: "Number", icon: Hash, description: "Numeric value, scores, or currency" },
  { type: "people", label: "People", icon: User, description: "Team member, product manager, or owner" },
  { type: "rating", label: "Rating", icon: Star, description: "1 to 5 star executive assessment" },
  { type: "reactions", label: "Reactions", icon: Smile, description: "Emoji reactions to vote or express sentiments" },
  { type: "select", label: "Select", icon: ChevronDown, description: "Single choice dropdown list" },
  { type: "text", label: "Short text", icon: Type, description: "Single line text input" },
  { type: "slider", label: "Slider", icon: Sliders, description: "Numeric range slider (0-100%)" },
];

/**
 * Suggested custom field names per category so users immediately understand
 * that each field type can be instantiated multiple times for specific phases.
 */
const FIELD_PRESETS: Record<CustomFieldType, string[]> = {
  date: [
    "Start date",
    "Start development",
    "End development",
    "Target launch",
    "Discovery kickoff",
    "QA sign-off",
  ],
  checkbox: [
    "Design approved",
    "Tech specs ready",
    "Security sign-off",
    "Architecture review",
    "Executive sign-off",
  ],
  people: [
    "Product Manager",
    "Tech Lead",
    "UX Designer",
    "QA Lead",
    "Executive Sponsor",
  ],
  select: [
    "Delivery Category",
    "T-Shirt Size",
    "Strategic Pillar",
    "Risk Level",
    "Squad / Pod",
  ],
  "multi-select": [
    "Customer Segment",
    "Target Platforms",
    "Impacted Teams",
    "Value Drivers",
  ],
  hyperlink: [
    "PRD Document",
    "Figma Specs",
    "Architecture RFC",
    "Analytics Dashboard",
  ],
  number: [
    "Story Points",
    "Target ARR ($K)",
    "Estimated Hours",
    "Confidence %",
  ],
  rating: [
    "Strategic Fit",
    "Executive Priority",
    "Customer Impact",
    "Feasibility",
  ],
  reactions: [
    "Team Sentiment",
    "Stakeholder Voting",
    "Customer Excitement",
  ],
  text: [
    "Target Persona",
    "Key KPI / Metric",
    "Release Notes Summary",
  ],
  slider: [
    "Completion %",
    "Confidence Level",
    "Risk Probability",
  ],
};

const COLOR_OPTIONS = [
  { id: "blue", label: "Blue", bg: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "green", label: "Green", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { id: "amber", label: "Amber", bg: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "purple", label: "Purple", bg: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "red", label: "Red", bg: "bg-red-100 text-red-800 border-red-200" },
  { id: "slate", label: "Slate", bg: "bg-slate-100 text-slate-800 border-slate-200" },
];

const QUICK_EMOJIS = ["👍", "❤️", "🚀", "🎉", "👀", "🔥", "💡", "👏", "🎯", "⚡"];

export function CreateCustomFieldModal({
  isOpen,
  onClose,
  workspaceId,
  existingCount,
}: CreateCustomFieldModalProps) {
  const [selectedType, setSelectedType] = useState<CustomFieldType | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<CustomFieldOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionColor, setNewOptionColor] = useState("blue");
  const [minVal, setMinVal] = useState<number>(1);
  const [maxVal, setMaxVal] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleSelectType(type: CustomFieldType) {
    setSelectedType(type);
    setErrorMsg(null);

    // Initialize with the first suggested preset as default, while allowing full editing
    const presets = FIELD_PRESETS[type] || [];
    setFieldName(presets[0] || "");

    if (type === "checkbox") {
      setOptions([
        { id: "item_1", label: "Item 1", color: "blue" },
        { id: "item_2", label: "Item 2", color: "green" },
      ]);
    } else if (type === "reactions") {
      setOptions([
        { id: "react_thumbs", label: "👍", color: "blue" },
        { id: "react_heart", label: "❤️", color: "red" },
        { id: "react_rocket", label: "🚀", color: "purple" },
        { id: "react_celebrate", label: "🎉", color: "amber" },
      ]);
    } else if (type === "select" || type === "multi-select") {
      setOptions([
        { id: "opt_1", label: "Option 1", color: "blue" },
        { id: "opt_2", label: "Option 2", color: "green" },
      ]);
    } else {
      setOptions([]);
    }
  }

  function handleAddOption(customLabel?: string) {
    const labelToAdd = (customLabel || newOptionLabel).trim();
    if (!labelToAdd) return;
    const newOpt: CustomFieldOption = {
      id: `opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      label: labelToAdd,
      color: newOptionColor,
    };
    setOptions((prev) => [...prev, newOpt]);
    if (!customLabel) {
      setNewOptionLabel("");
    }
  }

  function handleRemoveOption(id: string) {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }

  function handleReset() {
    setSelectedType(null);
    setFieldName("");
    setDescription("");
    setOptions([]);
    setNewOptionLabel("");
    setErrorMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;
    if (!fieldName.trim()) {
      setErrorMsg("Field name is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const fieldId = `cf_${fieldName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 24)}_${Date.now().toString().slice(-4)}`;

    const supportsOptions =
      selectedType === "select" ||
      selectedType === "multi-select" ||
      selectedType === "checkbox" ||
      selectedType === "reactions";

    const newField: CustomFieldDefinition = {
      id: fieldId,
      workspaceId,
      name: fieldName.trim(),
      type: selectedType,
      description: description.trim() || undefined,
      options: supportsOptions && options.length > 0 ? options : undefined,
      min: selectedType === "rating" || selectedType === "slider" ? minVal : undefined,
      max: selectedType === "rating" || selectedType === "slider" ? maxVal : undefined,
      visible: true,
      order: existingCount + 1,
      createdAt: new Date().toISOString(),
    };

    try {
      // Optimistic write guarantees 0ms freeze and immediate modal closure
      await optimisticWrite(createCustomField(newField));
      setSubmitting(false);
      handleReset();
      onClose();
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save custom field.");
    }
  }

  const supportsOptions =
    selectedType === "select" ||
    selectedType === "multi-select" ||
    selectedType === "checkbox" ||
    selectedType === "reactions";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {selectedType && (
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="text-slate-400 hover:text-slate-700 p-1 -ml-1 rounded transition-colors"
                title="Back to field types"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              {selectedType
                ? `Create a custom ${selectedType} field`
                : "Create a space field"}
            </h3>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 rounded p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Step 1: Select Field Type (Matching Jira Product Discovery Image 1 & 2) */}
        {!selectedType ? (
          <div className="p-4 overflow-y-auto flex-1">
            <div className="mb-3 px-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Standard fields ({FIELD_TYPES.length})
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select a field category. You can customize its name (e.g. for Date: &ldquo;Start development&rdquo; or &ldquo;End development&rdquo;).
              </p>
            </div>
            <div className="space-y-1">
              {FIELD_TYPES.map((ft) => {
                const Icon = ft.icon;
                return (
                  <button
                    key={ft.type}
                    onClick={() => handleSelectType(ft.type)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center text-slate-600 group-hover:text-blue-600">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-800 group-hover:text-slate-950">
                        {ft.label}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {ft.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Body Step 2: Configure Field */
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2.5">
                {errorMsg}
              </div>
            )}

            {/* Field Type Context Banner */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2.5 text-[11px] text-slate-600 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>
                Configuring a <strong>{selectedType}</strong> field. You can add multiple {selectedType} fields (such as <em>Start development</em> and <em>End development</em>) to capture different milestones.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Field Name
                </label>
                <span className="text-[10px] text-slate-400">e.g. Start development</span>
              </div>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder={
                  selectedType === "date"
                    ? "e.g. Start development, End development, Launch date"
                    : selectedType === "checkbox"
                    ? "e.g. Design review, Security audit checklist"
                    : "Enter custom field name..."
                }
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
                required
                autoFocus
              />

              {/* Quick suggestion presets chips */}
              {FIELD_PRESETS[selectedType] && (
                <div className="mt-2">
                  <span className="text-[10px] font-medium text-slate-500 block mb-1">
                    Suggested names:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {FIELD_PRESETS[selectedType].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFieldName(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          fieldName === preset
                            ? "bg-blue-600 text-white border-blue-600 font-medium"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this field captures..."
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Options configuration for Checkbox / Reactions / Select / Multi-Select */}
            {supportsOptions && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    {selectedType === "checkbox"
                      ? "Checkbox Items / Checklist"
                      : selectedType === "reactions"
                      ? "Reaction Emojis"
                      : "Dropdown Options"}
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {options.length} {options.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  {selectedType === "checkbox"
                    ? "Add items for a multi-item checklist. If you remove all items, this field functions as a single yes/no checkbox."
                    : selectedType === "reactions"
                    ? "Choose reaction emojis available for ideas."
                    : "Add selectable options and assign color badges."}
                </p>

                {/* Quick emoji helper for reactions */}
                {selectedType === "reactions" && (
                  <div className="flex flex-wrap gap-1 p-1.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 mr-1 self-center">Quick add:</span>
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAddOption(emoji)}
                        className="text-xs hover:scale-125 px-1 py-0.5 rounded transition-transform"
                        title={`Add ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* List of existing options */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {options.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-1">
                      {selectedType === "checkbox"
                        ? "No checklist items. (Will render as a single yes/no checkbox)."
                        : "No options added yet."}
                    </div>
                  ) : (
                    options.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2.5 py-1 rounded text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {selectedType === "checkbox" && (
                            <CheckSquare className="w-3 h-3 text-slate-400" />
                          )}
                          <span className="font-medium text-slate-800">{opt.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedType !== "reactions" && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded border ${
                                COLOR_OPTIONS.find((c) => c.id === opt.color)?.bg ||
                                "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {opt.color}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.id)}
                            className="text-slate-400 hover:text-red-600 p-0.5"
                            title="Remove item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new option input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    placeholder={
                      selectedType === "checkbox"
                        ? "Add checklist item (e.g. Design review)..."
                        : selectedType === "reactions"
                        ? "Emoji or label..."
                        : "New option label..."
                    }
                    className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                  />
                  {selectedType !== "reactions" && (
                    <select
                      value={newOptionColor}
                      onChange={(e) => setNewOptionColor(e.target.value)}
                      className="text-xs px-2 py-1 border border-slate-200 rounded bg-white text-slate-700"
                    >
                      {COLOR_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => handleAddOption()}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Limits configuration for Rating / Slider */}
            {(selectedType === "rating" || selectedType === "slider") && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Minimum
                  </label>
                  <input
                    type="number"
                    value={minVal}
                    onChange={(e) => setMinVal(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Maximum
                  </label>
                  <input
                    type="number"
                    value={maxVal}
                    onChange={(e) => setMaxVal(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedType(null)}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Field"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { CustomFieldDefinition, CustomFieldValue, CustomFieldOption } from "@/types/schema";
import { updateIdeaCustomFieldValue, addCustomFieldOption, optimisticWrite } from "@/lib/firebase/services";
import {
  ExternalLink,
  Star,
  Calendar,
  User,
  Check,
  Edit2,
  Plus,
  Smile,
  X,
  CheckSquare,
  ChevronDown,
} from "lucide-react";

interface CustomFieldCellProps {
  ideaId: string;
  field: CustomFieldDefinition;
  value: CustomFieldValue | undefined;
}

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  red: "bg-red-50 text-red-700 border-red-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

const DEFAULT_REACTIONS = ["👍", "❤️", "🚀", "🎉", "👀", "🔥", "💡", "👏"];

export function CustomFieldCell({ ideaId, field, value }: CustomFieldCellProps) {
  const [localVal, setLocalVal] = useState<CustomFieldValue>(value);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState<string>(String(value ?? ""));
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [inlineAdding, setInlineAdding] = useState(false);
  const [newOptionInput, setNewOptionInput] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep local state synchronized with incoming Firestore updates
  useEffect(() => {
    setLocalVal(value);
    setTempValue(String(value ?? ""));
  }, [value]);

  // Click outside listener for dropdowns & popovers
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
        setInlineAdding(false);
      }
    }
    if (popoverOpen || inlineAdding) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [popoverOpen, inlineAdding]);

  // Save changes with zero latency: local state updates immediately, Firestore writes optimistically
  async function handleSave(newVal: CustomFieldValue) {
    setLocalVal(newVal);
    setIsEditing(false);
    try {
      await optimisticWrite(updateIdeaCustomFieldValue(ideaId, field.id, newVal));
    } catch (err) {
      console.error("Failed to update custom field:", err);
    }
  }

  // Add new option to the field definition on the fly
  async function handleAddNewOption(label: string, color = "blue") {
    if (!label.trim()) return;
    const newOpt: CustomFieldOption = {
      id: `opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      label: label.trim(),
      color,
    };
    try {
      await optimisticWrite(addCustomFieldOption(field.id, newOpt));
      setNewOptionInput("");
      setInlineAdding(false);
    } catch (err) {
      console.error("Failed to add option:", err);
    }
  }

  // ==========================================
  // 1. CHECKBOX (Multi-item checklist OR single boolean)
  // ==========================================
  if (field.type === "checkbox") {
    const hasOptions = Array.isArray(field.options) && field.options.length > 0;

    if (hasOptions) {
      // Multi-item checklist mode
      const isItemChecked = (optId: string) => {
        if (Array.isArray(localVal)) {
          return localVal.includes(optId);
        }
        if (typeof localVal === "object" && localVal !== null) {
          return Boolean((localVal as Record<string, boolean>)[optId]);
        }
        return false;
      };

      const toggleItem = (optId: string) => {
        if (Array.isArray(localVal)) {
          const next = [...localVal];
          const idx = next.indexOf(optId);
          if (idx >= 0) next.splice(idx, 1);
          else next.push(optId);
          handleSave(next);
        } else {
          const currentMap =
            typeof localVal === "object" && localVal !== null && !Array.isArray(localVal)
              ? { ...(localVal as Record<string, boolean>) }
              : {};
          currentMap[optId] = !currentMap[optId];
          handleSave(currentMap);
        }
      };

      return (
        <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {field.options!.map((opt) => {
            const checked = isItemChecked(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleItem(opt.id)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border transition-colors ${
                  checked
                    ? "bg-blue-50 border-blue-200 text-blue-800 font-medium"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
                title={`Click to ${checked ? "uncheck" : "check"} ${opt.label}`}
              >
                <div
                  className={`w-3 h-3 rounded flex items-center justify-center border ${
                    checked
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span>{opt.label}</span>
              </button>
            );
          })}

          {/* Inline Add Checklist Item */}
          {inlineAdding ? (
            <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded shadow-sm px-1 py-0.5">
              <input
                type="text"
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewOption(newOptionInput);
                  } else if (e.key === "Escape") {
                    setInlineAdding(false);
                  }
                }}
                placeholder="Item label..."
                className="text-[11px] px-1 py-0.5 w-24 border-none outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleAddNewOption(newOptionInput)}
                className="text-[10px] text-blue-600 font-medium px-1 hover:text-blue-800"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setInlineAdding(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setInlineAdding(true)}
              className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Add checklist item"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    // Single Boolean Checkbox mode
    const isChecked = Boolean(localVal);
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => handleSave(e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
        />
        <span className="text-[11px] text-slate-500">{isChecked ? "Yes" : "No"}</span>
        {/* Shortcut to add items if desired */}
        {inlineAdding ? (
          <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded shadow-sm px-1 py-0.5">
            <input
              type="text"
              value={newOptionInput}
              onChange={(e) => setNewOptionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddNewOption(newOptionInput);
                } else if (e.key === "Escape") {
                  setInlineAdding(false);
                }
              }}
              placeholder="Add checklist item..."
              className="text-[11px] px-1 py-0.5 w-28 border-none outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleAddNewOption(newOptionInput)}
              className="text-[10px] text-blue-600 font-medium px-1 hover:text-blue-800"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setInlineAdding(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setInlineAdding(true)}
            className="text-[10px] text-slate-400 hover:text-blue-600 opacity-60 hover:opacity-100 transition-opacity"
            title="Convert to multi-item checklist"
          >
            + Item
          </button>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. REACTIONS (Emoji feedback / voting)
  // ==========================================
  if (field.type === "reactions") {
    const reactionCounts: Record<string, number> =
      typeof localVal === "object" && localVal !== null && !Array.isArray(localVal)
        ? { ...(localVal as Record<string, number>) }
        : {};

    const handleReactionClick = (emoji: string) => {
      const currentCount = reactionCounts[emoji] || 0;
      const nextCounts = { ...reactionCounts, [emoji]: currentCount + 1 };
      handleSave(nextCounts);
    };

    const handleReactionDecrement = (emoji: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const currentCount = reactionCounts[emoji] || 0;
      const nextCounts = { ...reactionCounts };
      if (currentCount <= 1) {
        delete nextCounts[emoji];
      } else {
        nextCounts[emoji] = currentCount - 1;
      }
      handleSave(nextCounts);
    };

    const availableEmojis =
      field.options && field.options.length > 0
        ? field.options.map((o) => o.label)
        : DEFAULT_REACTIONS;

    return (
      <div className="relative flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {Object.entries(reactionCounts).map(([emoji, count]) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleReactionClick(emoji)}
            onContextMenu={(e) => handleReactionDecrement(emoji, e)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition-colors"
            title={`${emoji} (${count}) - Left click to add, right click to decrement`}
          >
            <span>{emoji}</span>
            <span className="font-mono text-[10px] font-semibold text-slate-500">{count}</span>
          </button>
        ))}

        {/* Reaction Picker Button */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setPopoverOpen(!popoverOpen)}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-dashed border-slate-200"
            title="Add reaction"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {popoverOpen && (
            <div className="absolute left-0 bottom-full mb-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-48 animate-in fade-in zoom-in-95 duration-100">
              {availableEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleReactionClick(emoji);
                    setPopoverOpen(false);
                  }}
                  className="w-7 h-7 flex items-center justify-center text-sm rounded hover:bg-slate-100 hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. MULTI-SELECT (Tag badges & Dropdown)
  // ==========================================
  if (field.type === "multi-select") {
    const selectedIds: string[] = Array.isArray(localVal)
      ? (localVal as string[])
      : typeof localVal === "string" && localVal
      ? [localVal]
      : [];

    const toggleTag = (optId: string) => {
      const next = selectedIds.includes(optId)
        ? selectedIds.filter((id) => id !== optId)
        : [...selectedIds, optId];
      handleSave(next);
    };

    const selectedOptions = (field.options || []).filter((o) => selectedIds.includes(o.id));

    return (
      <div className="relative" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
        <div
          onClick={() => setPopoverOpen(!popoverOpen)}
          className="flex flex-wrap items-center gap-1 cursor-pointer min-h-[24px] p-0.5 rounded hover:bg-slate-50"
        >
          {selectedOptions.length === 0 ? (
            <span className="text-[11px] text-slate-300 hover:text-slate-500">+ Select</span>
          ) : (
            selectedOptions.map((opt) => {
              const colorClass = opt.color ? COLOR_CLASSES[opt.color] : "bg-slate-100 text-slate-700 border-slate-200";
              return (
                <span
                  key={opt.id}
                  className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${colorClass}`}
                >
                  {opt.label}
                </span>
              );
            })
          )}
        </div>

        {/* Dropdown Menu for Multi-Select */}
        {popoverOpen && (
          <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-md shadow-lg p-2 w-52 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
              Select options
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {(field.options || []).map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleTag(opt.id)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-slate-50 text-left"
                  >
                    <span className="font-medium text-slate-700">{opt.label}</span>
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Add Option */}
            <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1">
              <input
                type="text"
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                placeholder="New option..."
                className="flex-1 text-[11px] px-1.5 py-0.5 border border-slate-200 rounded focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewOption(newOptionInput);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleAddNewOption(newOptionInput)}
                className="text-[11px] text-blue-600 font-medium px-1 hover:text-blue-800"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 4. SELECT (Single choice dropdown)
  // ==========================================
  if (field.type === "select") {
    const strVal = typeof localVal === "string" ? localVal : "";
    const activeOption = field.options?.find((o) => o.id === strVal || o.label === strVal);
    const colorClass = activeOption?.color ? COLOR_CLASSES[activeOption.color] : "bg-slate-100 text-slate-700 border-slate-200";

    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <select
          value={activeOption?.id || strVal}
          onChange={(e) => handleSave(e.target.value)}
          className={`text-[11px] font-medium px-2 py-0.5 rounded border focus:outline-none cursor-pointer ${colorClass}`}
        >
          <option value="">— Select —</option>
          {field.options?.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {inlineAdding ? (
          <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded shadow-sm px-1 py-0.5">
            <input
              type="text"
              value={newOptionInput}
              onChange={(e) => setNewOptionInput(e.target.value)}
              placeholder="Option label..."
              className="text-[11px] px-1 py-0.5 w-20 border-none outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddNewOption(newOptionInput);
                } else if (e.key === "Escape") {
                  setInlineAdding(false);
                }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleAddNewOption(newOptionInput)}
              className="text-[10px] text-blue-600 font-medium px-1"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setInlineAdding(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setInlineAdding(true)}
            className="text-slate-400 hover:text-slate-700 p-0.5"
            title="Add new option to dropdown"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // ==========================================
  // 5. DATE
  // ==========================================
  if (field.type === "date") {
    const strVal = typeof localVal === "string" ? localVal : "";
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Calendar className="w-3 h-3 text-slate-400" />
        <input
          type="date"
          value={strVal}
          onChange={(e) => handleSave(e.target.value)}
          className="text-xs bg-transparent border-none text-slate-700 p-0 focus:outline-none focus:ring-0 cursor-pointer tabular-nums"
        />
        {strVal && (
          <button
            type="button"
            onClick={() => handleSave("")}
            className="text-slate-300 hover:text-slate-600 p-0.5"
            title="Clear date"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  // ==========================================
  // 6. PEOPLE
  // ==========================================
  if (field.type === "people") {
    const strVal = typeof localVal === "string" ? localVal : "";
    if (isEditing) {
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => handleSave(tempValue)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave(tempValue);
            }}
            placeholder="Assignee name..."
            className="text-xs px-1.5 py-0.5 border border-slate-300 rounded w-28 focus:outline-none"
            autoFocus
          />
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="flex items-center gap-1 text-[11px] text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60"
        title="Click to edit person"
      >
        <User className="w-3 h-3 text-slate-400" />
        <span>{strVal || "Unassigned"}</span>
      </button>
    );
  }

  // ==========================================
  // 7. RATING (Stars)
  // ==========================================
  if (field.type === "rating") {
    const numVal = typeof localVal === "number" ? localVal : 0;
    const max = field.max || 5;

    return (
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {Array.from({ length: max }).map((_, idx) => {
          const starNum = idx + 1;
          const isFilled = starNum <= numVal;
          return (
            <button
              key={starNum}
              type="button"
              onClick={() => handleSave(starNum === numVal ? 0 : starNum)}
              className="p-0.5 hover:scale-110 transition-transform"
              title={`${starNum} of ${max}`}
            >
              <Star
                className={`w-3 h-3 ${
                  isFilled ? "text-amber-400 fill-amber-400" : "text-slate-200"
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  }

  // ==========================================
  // 8. HYPERLINK
  // ==========================================
  if (field.type === "hyperlink") {
    const strVal = typeof localVal === "string" ? localVal : "";
    if (isEditing) {
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="url"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => handleSave(tempValue)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave(tempValue);
            }}
            placeholder="https://..."
            className="text-xs px-1.5 py-0.5 border border-slate-300 rounded w-32 focus:outline-none"
            autoFocus
          />
        </div>
      );
    }
    if (!strVal) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="text-[11px] text-slate-400 hover:text-slate-700"
        >
          + Add link
        </button>
      );
    }
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <a
          href={strVal}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline max-w-[120px] truncate"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{strVal.replace(/^https?:\/\//, "")}</span>
        </a>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-slate-300 hover:text-slate-600 p-0.5"
          title="Edit URL"
        >
          <Edit2 className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  // ==========================================
  // 9. NUMBER / SLIDER
  // ==========================================
  if (field.type === "number" || field.type === "slider") {
    const numVal = typeof localVal === "number" ? localVal : "";
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="number"
          value={numVal}
          min={field.min}
          max={field.max}
          onChange={(e) => handleSave(e.target.value === "" ? null : Number(e.target.value))}
          placeholder="0"
          className="w-16 text-xs px-1.5 py-0.5 border border-slate-200 rounded font-mono tabular-nums focus:outline-none focus:border-slate-400"
        />
      </div>
    );
  }

  // ==========================================
  // 10. SHORT TEXT (Default)
  // ==========================================
  const strVal = typeof localVal === "string" ? localVal : "";
  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => handleSave(tempValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave(tempValue);
          }}
          className="text-xs px-1.5 py-0.5 border border-slate-300 rounded w-28 focus:outline-none"
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="text-xs text-slate-700 hover:text-slate-900 truncate max-w-[120px] text-left"
      title="Click to edit"
    >
      {strVal || <span className="text-slate-300">—</span>}
    </button>
  );
}

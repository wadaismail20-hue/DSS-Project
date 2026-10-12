"use client";

import React, { useState, useEffect } from "react";
import { CustomFieldDefinition, CustomFieldType } from "@/types/schema";
import {
  toggleCustomFieldVisibility,
  deleteCustomField,
  reorderCustomFields,
  updateCustomField,
  optimisticWrite,
} from "@/lib/firebase/services";
import { Button } from "@/components/ui/button";
import {
  X,
  Search,
  GripVertical,
  CheckSquare,
  Calendar,
  Link as LinkIcon,
  ListFilter,
  Hash,
  User,
  Star,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Type,
  Sliders,
  Smile,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";

interface FieldsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customFields: CustomFieldDefinition[];
  onOpenCreateField: () => void;
}

function getFieldIcon(type: CustomFieldType) {
  switch (type) {
    case "checkbox":
      return CheckSquare;
    case "date":
      return Calendar;
    case "hyperlink":
      return LinkIcon;
    case "multi-select":
      return ListFilter;
    case "number":
      return Hash;
    case "people":
      return User;
    case "rating":
      return Star;
    case "reactions":
      return Smile;
    case "select":
      return ChevronDown;
    case "text":
      return Type;
    case "slider":
      return Sliders;
    default:
      return Type;
  }
}

export function FieldsDrawer({
  isOpen,
  onClose,
  customFields,
  onOpenCreateField,
}: FieldsDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [availableExpanded, setAvailableExpanded] = useState(true);
  const [orderedActiveFields, setOrderedActiveFields] = useState<CustomFieldDefinition[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Keep local ordered active fields synchronized with incoming Firestore updates
  useEffect(() => {
    const active = customFields
      .filter((f) => f.visible)
      .sort((a, b) => a.order - b.order);
    setOrderedActiveFields(active);
  }, [customFields]);

  if (!isOpen) return null;

  const filteredActive = orderedActiveFields.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableFields = customFields
    .filter((f) => !f.visible)
    .filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Toggle field visibility (Show / Hide in current view)
  async function handleToggle(field: CustomFieldDefinition) {
    try {
      const willBeVisible = !field.visible;
      await optimisticWrite(toggleCustomFieldVisibility(field.id, willBeVisible));
      if (willBeVisible) {
        // Append to active fields at the end
        const newActive = [...orderedActiveFields, { ...field, visible: true }];
        setOrderedActiveFields(newActive);
        await optimisticWrite(reorderCustomFields(newActive.map((f) => f.id)));
      }
    } catch (err) {
      console.error("Failed to toggle field:", err);
    }
  }

  // Delete field definition permanently
  async function handleDelete(fieldId: string) {
    if (confirm("Delete this custom field definition from workspace?")) {
      try {
        await optimisticWrite(deleteCustomField(fieldId));
      } catch (err) {
        console.error("Failed to delete field:", err);
      }
    }
  }

  // Reorder active fields via Move Up / Move Down
  async function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedActiveFields.length) return;

    const updated = [...orderedActiveFields];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setOrderedActiveFields(updated);
    try {
      await optimisticWrite(reorderCustomFields(updated.map((f) => f.id)));
    } catch (err) {
      console.error("Failed to reorder fields:", err);
    }
  }

  // HTML5 Drag and Drop Handlers
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...orderedActiveFields];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    setOrderedActiveFields(updated);
    setDraggedIndex(null);

    try {
      await optimisticWrite(reorderCustomFields(updated.map((f) => f.id)));
    } catch (err) {
      console.error("Failed to reorder fields:", err);
    }
  }

  // Inline rename handler
  function startRename(field: CustomFieldDefinition) {
    setEditingFieldId(field.id);
    setEditingName(field.name);
  }

  async function saveRename(fieldId: string) {
    if (!editingName.trim()) {
      setEditingFieldId(null);
      return;
    }
    const newName = editingName.trim();
    setEditingFieldId(null);

    setOrderedActiveFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, name: newName } : f))
    );

    try {
      await optimisticWrite(updateCustomField(fieldId, { name: newName }));
    } catch (err) {
      console.error("Failed to rename custom field:", err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/20 backdrop-blur-[2px]">
      <div className="bg-white w-full max-w-sm h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header (Matching Jira Product Discovery Image 2) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">Fields</h3>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {orderedActiveFields.length} active
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded transition-colors"
              title="Field settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search all space fields"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Scrollable Fields List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Active Fields in Table View (Reorderable with Grips & Up/Down arrows) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                In this view ({filteredActive.length})
              </span>
              <span className="text-[10px] text-slate-400">Drag grip or use arrows to reorder</span>
            </div>

            <div className="space-y-1">
              {filteredActive.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
                  No active fields in current view
                </div>
              ) : (
                filteredActive.map((field, index) => {
                  const Icon = getFieldIcon(field.type);
                  const isEditing = editingFieldId === field.id;

                  return (
                    <div
                      key={field.id}
                      draggable={!isEditing}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`flex items-center justify-between p-2 rounded-md transition-all group border ${
                        draggedIndex === index
                          ? "bg-blue-50/70 border-blue-300 shadow-sm opacity-60"
                          : "bg-white hover:bg-slate-50 border-slate-100"
                      }`}
                    >
                      {/* Left: Reorder Grip, Move Arrows, Icon & Name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                        {/* Drag Grip Handle */}
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 p-0.5"
                          title="Drag to reorganize columns"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        {/* Move Up / Move Down Arrow Buttons */}
                        <div className="flex flex-col -space-y-0.5 opacity-60 group-hover:opacity-100">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, "up")}
                            className="text-slate-400 hover:text-blue-600 disabled:opacity-20 p-0.5 leading-none transition-colors"
                            title="Move column left / up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === filteredActive.length - 1}
                            onClick={() => handleMove(index, "down")}
                            className="text-slate-400 hover:text-blue-600 disabled:opacity-20 p-0.5 leading-none transition-colors"
                            title="Move column right / down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Field Type Icon */}
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-100/70 text-slate-600 flex-shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        {/* Field Name & Category Badge */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveRename(field.id);
                                  if (e.key === "Escape") setEditingFieldId(null);
                                }}
                                className="text-xs px-1.5 py-0.5 border border-slate-300 rounded focus:outline-none w-full"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => saveRename(field.id)}
                                className="text-emerald-600 hover:text-emerald-700 p-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className="text-xs font-medium text-slate-800 truncate cursor-pointer hover:text-blue-600"
                                onClick={() => startRename(field)}
                                title="Click to rename field"
                              >
                                {field.name}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                                {field.type}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions & Green Active Toggle */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => startRename(field)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-1 transition-opacity"
                            title="Rename field"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(field.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-1 transition-opacity"
                          title="Delete field"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        {/* Green toggle switch (Active in View) */}
                        <button
                          type="button"
                          onClick={() => handleToggle(field)}
                          className="w-8 h-4 bg-emerald-600 rounded-full relative cursor-pointer transition-colors p-0.5"
                          title="Hide field in this view"
                        >
                          <div className="w-3 h-3 bg-white rounded-full ml-auto shadow-sm" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Available Fields (Inactive in Current View) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAvailableExpanded(!availableExpanded)}
              className="w-full flex items-center justify-between mb-1.5 px-1 text-left group"
            >
              <div>
                <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Available fields ({availableFields.length})
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Toggle a field to add it to this view.
                </p>
              </div>
              <div className="text-slate-400 group-hover:text-slate-600 p-1">
                {availableExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </button>

            {availableExpanded && (
              <div className="space-y-1 mt-2">
                {availableFields.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded">
                    All workspace fields are active in this view
                  </div>
                ) : (
                  availableFields.map((field) => {
                    const Icon = getFieldIcon(field.type);
                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-600">{field.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              {field.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(field.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-1 transition-opacity"
                            title="Delete field"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          {/* Inactive toggle switch (Grey) */}
                          <button
                            type="button"
                            onClick={() => handleToggle(field)}
                            className="w-8 h-4 bg-slate-300 rounded-full relative cursor-pointer transition-colors p-0.5"
                            title="Show field in view"
                          >
                            <div className="w-3 h-3 bg-white rounded-full mr-auto shadow-sm" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions (Matching Jira Product Discovery Image 2) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCreateField}
            className="flex-1 text-xs border-slate-200"
          >
            Add a global field
          </Button>
          <Button
            size="sm"
            onClick={onOpenCreateField}
            className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Create a space field
          </Button>
        </div>
      </div>
    </div>
  );
}

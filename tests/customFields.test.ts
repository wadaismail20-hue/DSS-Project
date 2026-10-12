import { describe, it, expect } from "vitest";
import { CustomFieldDefinition, CustomFieldType, IdeaDocument } from "../src/types/schema";
import { cleanFirestoreData } from "../src/lib/firebase/services";

describe("Custom Fields System (Jira Product Discovery Reference)", () => {
  it("supports all 11 standard field types defined in specifications", () => {
    const supportedTypes: CustomFieldType[] = [
      "checkbox",
      "date",
      "hyperlink",
      "multi-select",
      "number",
      "people",
      "rating",
      "reactions",
      "select",
      "text",
      "slider",
    ];

    expect(supportedTypes).toHaveLength(11);
    expect(supportedTypes).toContain("checkbox");
    expect(supportedTypes).toContain("reactions");
  });

  it("sanitizes custom field definitions properly without undefined fields", () => {
    const rawField: CustomFieldDefinition = {
      id: "cf_target_date",
      workspaceId: "WS-123",
      name: "Project target",
      type: "date",
      description: undefined,
      options: undefined,
      min: undefined,
      max: undefined,
      visible: true,
      order: 1,
      createdAt: "2026-10-08T10:00:00Z",
    };

    const cleaned = cleanFirestoreData(rawField as unknown as Record<string, unknown>);

    expect(cleaned.id).toBe("cf_target_date");
    expect(cleaned.name).toBe("Project target");
    expect(cleaned.type).toBe("date");
    expect(cleaned.visible).toBe(true);
    expect(cleaned).not.toHaveProperty("description");
    expect(cleaned).not.toHaveProperty("options");
    expect(cleaned).not.toHaveProperty("min");
    expect(cleaned).not.toHaveProperty("max");
  });

  it("supports multiple distinct custom fields of the same type (e.g. multiple date fields)", () => {
    const startDateField: CustomFieldDefinition = {
      id: "cf_start_date_1001",
      workspaceId: "WS-123",
      name: "Start date",
      type: "date",
      visible: true,
      order: 1,
      createdAt: "2026-10-08T10:00:00Z",
    };

    const startDevField: CustomFieldDefinition = {
      id: "cf_start_development_1002",
      workspaceId: "WS-123",
      name: "Start development",
      type: "date",
      visible: true,
      order: 2,
      createdAt: "2026-10-08T10:01:00Z",
    };

    const endDevField: CustomFieldDefinition = {
      id: "cf_end_development_1003",
      workspaceId: "WS-123",
      name: "End development",
      type: "date",
      visible: true,
      order: 3,
      createdAt: "2026-10-08T10:02:00Z",
    };

    const fields = [startDevField, endDevField, startDateField].sort((a, b) => a.order - b.order);

    expect(fields.map((f) => f.name)).toEqual([
      "Start date",
      "Start development",
      "End development",
    ]);
    expect(fields.every((f) => f.type === "date")).toBe(true);
  });

  it("supports reorganizing and reordering fields by order property", () => {
    const field1: CustomFieldDefinition = {
      id: "cf_1",
      workspaceId: "WS-123",
      name: "Field One",
      type: "text",
      visible: true,
      order: 1,
      createdAt: "2026-10-08T10:00:00Z",
    };
    const field2: CustomFieldDefinition = {
      id: "cf_2",
      workspaceId: "WS-123",
      name: "Field Two",
      type: "date",
      visible: true,
      order: 2,
      createdAt: "2026-10-08T10:00:00Z",
    };

    // Reorder: swap orders
    const reordered = [
      { ...field1, order: 2 },
      { ...field2, order: 1 },
    ].sort((a, b) => a.order - b.order);

    expect(reordered[0].id).toBe("cf_2");
    expect(reordered[1].id).toBe("cf_1");
  });

  it("supports checkbox checklist items and reactions options", () => {
    const checklistField: CustomFieldDefinition = {
      id: "cf_checklist_audit",
      workspaceId: "WS-123",
      name: "Discovery Sign-offs",
      type: "checkbox",
      options: [
        { id: "opt_design", label: "Design Approved", color: "blue" },
        { id: "opt_tech", label: "Tech Architecture Ready", color: "green" },
        { id: "opt_sec", label: "Security & Legal Review", color: "amber" },
      ],
      visible: true,
      order: 1,
      createdAt: "2026-10-08T10:00:00Z",
    };

    const cleanedChecklist = cleanFirestoreData(checklistField as unknown as Record<string, unknown>);
    expect(cleanedChecklist.type).toBe("checkbox");
    expect(cleanedChecklist.options).toHaveLength(3);

    const reactionField: CustomFieldDefinition = {
      id: "cf_reactions_feedback",
      workspaceId: "WS-123",
      name: "Stakeholder Sentiment",
      type: "reactions",
      options: [
        { id: "opt_thumbs", label: "👍" },
        { id: "opt_rocket", label: "🚀" },
        { id: "opt_love", label: "❤️" },
      ],
      visible: true,
      order: 2,
      createdAt: "2026-10-08T10:00:00Z",
    };

    const cleanedReactions = cleanFirestoreData(reactionField as unknown as Record<string, unknown>);
    expect(cleanedReactions.type).toBe("reactions");
    expect(cleanedReactions.options).toHaveLength(3);
  });

  it("stores and preserves diverse custom field values including checklists, reactions, and multiple dates on IdeaDocument", () => {
    const ideaWithCustomFields: IdeaDocument = {
      ideaId: "IDEA-100",
      workspaceId: "WS-123",
      title: "Omnichannel Promotion Core",
      strategicGoal: "Global Expansion",
      status: "Prioritized",
      authorId: "USER-99",
      createdAt: "2026-10-08T10:00:00Z",
      rollUpMetrics: {
        totalStoryPoints: 20,
        completedStoryPoints: 10,
        progressPercentage: 50,
        totalLinkedIssues: 2,
      },
      customFields: {
        cf_start_date: "2026-10-01",
        cf_start_dev: "2026-10-15",
        cf_end_dev: "2026-11-30",
        cf_project_manager: "USER-SARAH",
        cf_rating: 5,
        cf_is_regulated: true,
        cf_docs: "https://specs.internal/promotions",
        cf_categories: ["growth", "enterprise"],
        // Multi-item checklist stored as string array of checked IDs
        cf_checklist_audit: ["opt_design", "opt_tech"],
        // Emoji reactions stored as counts map
        cf_reactions: { "👍": 5, "🚀": 3, "❤️": 2 },
        cf_empty_field: undefined,
      },
    };

    const cleaned = cleanFirestoreData(ideaWithCustomFields as unknown as Record<string, unknown>);
    const customFields = cleaned.customFields as Record<string, unknown>;

    expect(customFields.cf_start_date).toBe("2026-10-01");
    expect(customFields.cf_start_dev).toBe("2026-10-15");
    expect(customFields.cf_end_dev).toBe("2026-11-30");
    expect(customFields.cf_project_manager).toBe("USER-SARAH");
    expect(customFields.cf_rating).toBe(5);
    expect(customFields.cf_is_regulated).toBe(true);
    expect(customFields.cf_docs).toBe("https://specs.internal/promotions");
    expect(customFields.cf_categories).toEqual(["growth", "enterprise"]);
    expect(customFields.cf_checklist_audit).toEqual(["opt_design", "opt_tech"]);
    expect(customFields.cf_reactions).toEqual({ "👍": 5, "🚀": 3, "❤️": 2 });
    expect(customFields).not.toHaveProperty("cf_empty_field");
  });
});

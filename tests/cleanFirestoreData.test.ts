import { describe, it, expect } from "vitest";
import { cleanFirestoreData } from "../src/lib/firebase/services";

describe("cleanFirestoreData", () => {
  it("removes undefined fields like parentEpicId: undefined from document payloads", () => {
    const rawIssuePayload = {
      issueId: "DEV-101",
      workspaceId: "WS-123",
      type: "Story",
      title: "test-dev",
      status: "To Do",
      storyPoints: 5,
      parentIdeaId: "IDEA-001",
      parentEpicId: undefined, // Causes Firestore to throw 'Unsupported field value: undefined'
      sprintId: "SPRINT-24",
      assigneeId: "USER-42",
      updatedAt: "2026-10-08T11:15:00Z",
    };

    const sanitized = cleanFirestoreData(rawIssuePayload);

    expect(sanitized).not.toHaveProperty("parentEpicId");
    expect("parentEpicId" in sanitized).toBe(false);
    expect(sanitized.issueId).toBe("DEV-101");
    expect(sanitized.title).toBe("test-dev");
  });

  it("preserves valid falsy values such as 0, empty string, false, and null", () => {
    const payload = {
      storyPoints: 0,
      description: "",
      isActive: false,
      reviewerId: null,
      optionalUndefined: undefined,
    };

    const sanitized = cleanFirestoreData(payload as Record<string, unknown>);

    expect(sanitized.storyPoints).toBe(0);
    expect(sanitized.description).toBe("");
    expect(sanitized.isActive).toBe(false);
    expect(sanitized.reviewerId).toBe(null);
    expect("optionalUndefined" in sanitized).toBe(false);
  });

  it("recursively sanitizes nested objects and arrays", () => {
    const complexPayload = {
      id: "DOC-1",
      meta: {
        author: "USER-1",
        secondaryAuthor: undefined,
        deep: {
          valid: 123,
          bad: undefined,
        },
      },
      tags: ["tag1", "tag2"],
    };

    const sanitized = cleanFirestoreData(complexPayload);

    expect(sanitized.meta).toEqual({
      author: "USER-1",
      deep: {
        valid: 123,
      },
    });
    expect(sanitized.tags).toEqual(["tag1", "tag2"]);
  });
});

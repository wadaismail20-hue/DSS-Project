import { describe, it, expect } from "vitest";
import { cleanFirestoreData } from "../src/lib/firebase/services";
import { calculateRollUpMetrics, IssueDocument, IdeaDocument } from "../src/types/schema";

describe("Unified Product OS Schema & Logic Integrity", () => {
  it("creates valid IssueDocument without undefined values even when optional fields are omitted", () => {
    const rawFormState = {
      issueId: "DEV-101",
      workspaceId: "WS-123",
      type: "Story" as const,
      title: "test-dev",
      status: "To Do" as const,
      storyPoints: 5,
      parentIdeaId: "IDEA-001",
      parentEpicId: undefined, // user did not select a parent epic
      sprintId: "SPRINT-24",
      assigneeId: "USER-42",
      updatedAt: "2026-10-08T11:15:00Z",
      description: undefined, // user did not provide description
    };

    const sanitized = cleanFirestoreData(rawFormState);

    // Verify parentEpicId and description are completely absent from Firestore payload
    expect(sanitized).not.toHaveProperty("parentEpicId");
    expect(sanitized).not.toHaveProperty("description");

    // All required fields are preserved
    expect(sanitized.issueId).toBe("DEV-101");
    expect(sanitized.workspaceId).toBe("WS-123");
    expect(sanitized.type).toBe("Story");
    expect(sanitized.title).toBe("test-dev");
    expect(sanitized.status).toBe("To Do");
    expect(sanitized.storyPoints).toBe(5);
    expect(sanitized.parentIdeaId).toBe("IDEA-001");
    expect(sanitized.sprintId).toBe("SPRINT-24");
    expect(sanitized.assigneeId).toBe("USER-42");
  });

  it("creates valid IdeaDocument with sanitized optional fields", () => {
    const rawIdeaState = {
      ideaId: "IDEA-001",
      workspaceId: "WS-123",
      title: "Multi-brand Promotional System",
      strategicGoal: "Q3 Revenue Growth",
      status: "Prioritized",
      authorId: "USER-99",
      createdAt: "2026-10-08T10:00:00Z",
      targetQuarter: undefined,
      impactScore: undefined,
      effortScore: undefined,
      riceScore: undefined,
      description: undefined,
      rollUpMetrics: {
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        progressPercentage: 0,
        totalLinkedIssues: 0,
      },
    };

    const sanitized = cleanFirestoreData(rawIdeaState);

    expect(sanitized).not.toHaveProperty("targetQuarter");
    expect(sanitized).not.toHaveProperty("impactScore");
    expect(sanitized).not.toHaveProperty("effortScore");
    expect(sanitized).not.toHaveProperty("riceScore");
    expect(sanitized).not.toHaveProperty("description");

    expect(sanitized.ideaId).toBe("IDEA-001");
    expect(sanitized.title).toBe("Multi-brand Promotional System");
    expect(sanitized.rollUpMetrics).toEqual({
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      progressPercentage: 0,
      totalLinkedIssues: 0,
    });
  });

  it("accurately updates rollUpMetrics when issue status transitions from To Do -> In Progress -> Done", () => {
    let childIssues: IssueDocument[] = [
      {
        issueId: "DEV-101",
        workspaceId: "WS-123",
        type: "Story",
        title: "Feature A",
        status: "To Do",
        storyPoints: 8,
        parentIdeaId: "IDEA-001",
        sprintId: "SPRINT-24",
        assigneeId: "USER-42",
        updatedAt: "2026-10-08T00:00:00Z",
      },
      {
        issueId: "DEV-102",
        workspaceId: "WS-123",
        type: "Task",
        title: "Setup B",
        status: "To Do",
        storyPoints: 2,
        parentIdeaId: "IDEA-001",
        sprintId: "SPRINT-24",
        assigneeId: "USER-42",
        updatedAt: "2026-10-08T00:00:00Z",
      },
    ];

    // Initial state: 0% complete
    let metrics = calculateRollUpMetrics(childIssues);
    expect(metrics.totalStoryPoints).toBe(10);
    expect(metrics.completedStoryPoints).toBe(0);
    expect(metrics.progressPercentage).toBe(0);

    // Transition DEV-102 to Done: 2/10 = 20%
    childIssues = childIssues.map((i) => (i.issueId === "DEV-102" ? { ...i, status: "Done" as const } : i));
    metrics = calculateRollUpMetrics(childIssues);
    expect(metrics.completedStoryPoints).toBe(2);
    expect(metrics.progressPercentage).toBe(20);

    // Transition DEV-101 to Done: 10/10 = 100%
    childIssues = childIssues.map((i) => (i.issueId === "DEV-101" ? { ...i, status: "Done" as const } : i));
    metrics = calculateRollUpMetrics(childIssues);
    expect(metrics.completedStoryPoints).toBe(10);
    expect(metrics.progressPercentage).toBe(100);
  });
});

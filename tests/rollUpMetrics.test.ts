import { describe, it, expect } from "vitest";
import { calculateRollUpMetrics, IssueDocument } from "../src/types/schema";

describe("calculateRollUpMetrics", () => {
  it("returns zeroed metrics when no child issues are linked", () => {
    const result = calculateRollUpMetrics([]);
    expect(result).toEqual({
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      progressPercentage: 0,
      totalLinkedIssues: 0,
    });
  });

  it("calculates exact story point totals and progress percentage for estimated issues", () => {
    const issues: IssueDocument[] = [
      {
        issueId: "DEV-101",
        workspaceId: "WS-123",
        type: "Epic",
        title: "Architecture",
        status: "Done",
        storyPoints: 13,
        parentIdeaId: "IDEA-001",
        sprintId: "SPRINT-23",
        assigneeId: "USER-1",
        updatedAt: "2026-10-08T00:00:00Z",
      },
      {
        issueId: "DEV-102",
        workspaceId: "WS-123",
        type: "Story",
        title: "API Endpoint",
        status: "In Progress",
        storyPoints: 8,
        parentIdeaId: "IDEA-001",
        sprintId: "SPRINT-24",
        assigneeId: "USER-2",
        updatedAt: "2026-10-08T00:00:00Z",
      },
      {
        issueId: "DEV-103",
        workspaceId: "WS-123",
        type: "Task",
        title: "Setup CI/CD",
        status: "Done",
        storyPoints: 5,
        parentIdeaId: "IDEA-001",
        sprintId: "SPRINT-24",
        assigneeId: "USER-3",
        updatedAt: "2026-10-08T00:00:00Z",
      },
      {
        issueId: "DEV-104",
        workspaceId: "WS-123",
        type: "Bug",
        title: "Fix crash",
        status: "To Do",
        storyPoints: 4,
        parentIdeaId: "IDEA-001",
        sprintId: "SPRINT-24",
        assigneeId: "USER-4",
        updatedAt: "2026-10-08T00:00:00Z",
      },
    ];

    // Total points = 13 + 8 + 5 + 4 = 30
    // Done points = 13 + 5 = 18
    // Progress % = (18 / 30) * 100 = 60.0%
    const metrics = calculateRollUpMetrics(issues);

    expect(metrics.totalLinkedIssues).toBe(4);
    expect(metrics.totalStoryPoints).toBe(30);
    expect(metrics.completedStoryPoints).toBe(18);
    expect(metrics.progressPercentage).toBe(60);
  });

  it("handles 100% completion accurately", () => {
    const issues: IssueDocument[] = [
      {
        issueId: "DEV-201",
        workspaceId: "WS-123",
        type: "Story",
        title: "Item 1",
        status: "Done",
        storyPoints: 10,
        parentIdeaId: "IDEA-002",
        sprintId: "SPRINT-23",
        assigneeId: "USER-1",
        updatedAt: "2026-10-08T00:00:00Z",
      },
      {
        issueId: "DEV-202",
        workspaceId: "WS-123",
        type: "Story",
        title: "Item 2",
        status: "Done",
        storyPoints: 15,
        parentIdeaId: "IDEA-002",
        sprintId: "SPRINT-23",
        assigneeId: "USER-2",
        updatedAt: "2026-10-08T00:00:00Z",
      },
    ];

    const metrics = calculateRollUpMetrics(issues);

    expect(metrics.totalStoryPoints).toBe(25);
    expect(metrics.completedStoryPoints).toBe(25);
    expect(metrics.progressPercentage).toBe(100);
  });

  it("falls back to item count completion ratio when no issues have story point estimates", () => {
    const issues: IssueDocument[] = [
      {
        issueId: "DEV-301",
        workspaceId: "WS-123",
        type: "Story",
        title: "Unestimated 1",
        status: "Done",
        storyPoints: 0,
        parentIdeaId: "IDEA-003",
        sprintId: "SPRINT-23",
        assigneeId: "USER-1",
        updatedAt: "2026-10-08T00:00:00Z",
      },
      {
        issueId: "DEV-302",
        workspaceId: "WS-123",
        type: "Task",
        title: "Unestimated 2",
        status: "In Progress",
        storyPoints: 0,
        parentIdeaId: "IDEA-003",
        sprintId: "SPRINT-23",
        assigneeId: "USER-2",
        updatedAt: "2026-10-08T00:00:00Z",
      },
    ];

    // Total points = 0
    // Done count = 1 / 2 = 50%
    const metrics = calculateRollUpMetrics(issues);

    expect(metrics.totalStoryPoints).toBe(0);
    expect(metrics.completedStoryPoints).toBe(0);
    expect(metrics.totalLinkedIssues).toBe(2);
    expect(metrics.progressPercentage).toBe(50);
  });
});

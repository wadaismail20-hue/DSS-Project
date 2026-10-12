# Technical Architecture & Business Logic

## 1. System Overview
The Unified Product OS unifies strategic discovery and agile execution into a single reactive application. It communicates directly with Firebase Firestore using client-side `onSnapshot` real-time listeners.

## 2. Executive Roll-up Calculation Logic
- Every strategic initiative (`IdeaDocument`) maintains a denormalized `rollUpMetrics` object:
  - `totalStoryPoints`: `sum(issue.storyPoints)` for all linked delivery issues where `parentIdeaId === ideaId`.
  - `completedStoryPoints`: `sum(issue.storyPoints)` for all linked delivery issues where `parentIdeaId === ideaId && issue.status === 'Done'`.
  - `progressPercentage`: `(completedStoryPoints / totalStoryPoints) * 100` (or issue count completion ratio if unestimated).
  - `totalLinkedIssues`: Total count of child delivery issues.
- When an issue's status or story points change (e.g. moved on the Kanban board or inline status dropdown), Firestore documents are updated atomically and roll-up metrics recomputed and persisted.

## 3. Module A: Discovery Traceability Matrix
- Hierarchical table: Strategic Ideas expandable to reveal linked Epics, Stories, Tasks, and Bugs.
- Displays strategic goal, RICE score, timeframe, status, and progress metrics.
- Allows inline mutation and creation of linked work items.

## 4. Module B: Agile Delivery Kanban Board
- 4 Columns: `To Do`, `In Progress`, `Review`, `Done`.
- Multi-dimensional filtering by Sprint, Strategic Idea, and Issue Type.
- Instant drag / button transitions updating Firestore in real-time.

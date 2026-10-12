# Database Architecture (Firebase Firestore)
The database is structured as a NoSQL document database optimized for read-heavy operations and real-time dashboard rendering. Deeply nested subcollections are avoided in favor of a flattened, relational structure.

## 1. Collection: `workspaces`
Isolates data per tenant, division, or company.
* `workspaceId` (String)
* `name` (String)
* `settings` (Map)

## 2. Collection: `ideas` (Discovery Module)
Serves as the parent document for strategic initiatives. 
```json
{
  "ideaId": "IDEA-001",
  "workspaceId": "WS-123",
  "title": "Multi-brand Promotional System",
  "strategicGoal": "Q3 Revenue Growth",
  "status": "Prioritized",
  "authorId": "USER-99",
  "createdAt": "2026-10-08T10:00:00Z",
  "rollUpMetrics": {
    "totalStoryPoints": 120,
    "completedStoryPoints": 45,
    "progressPercentage": 37.5,
    "totalLinkedIssues": 14
  }
}
```

## 3. Collection: `issues` (Delivery Module)
Represents engineering work items linked to an Idea or Epic.
```json
{
  "issueId": "DEV-105",
  "workspaceId": "WS-123",
  "type": "Story",
  "title": "Backend API for Discount Logic",
  "status": "In Progress",
  "storyPoints": 8,
  "parentIdeaId": "IDEA-001", 
  "parentEpicId": "DEV-101",
  "sprintId": "SPRINT-24",
  "assigneeId": "USER-42",
  "updatedAt": "2026-10-08T11:15:00Z"
}
```

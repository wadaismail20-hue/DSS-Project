# Unified Product OS

A 100% standalone executive SaaS platform unifying **Jira Product Discovery** (Strategy & Traceability) and **Jira Software** (Agile Execution) into a single, seamless codebase powered by real-time **Firebase Firestore** synchronization.

Designed according to executive minimalist corporate design standards (Apple / BCG standard).

---

## Architecture & Specifications

This platform strictly adheres to the four core specification documents:
1. `docs/01_BRD_PRD_Overview.md`: Business requirements, native traceability, executive roll-ups.
2. `docs/02_Database_Schema.md`: Flattened NoSQL schema for `workspaces`, `ideas`, and `issues`.
3. `docs/03_Technical_Architecture_Logic.md`: Real-time roll-up calculation engine and hierarchy traversal.
4. `docs/04_Antislop_Agent_Instructions.md`: Zero Dummy Data Guarantee, strict TypeScript (0 `any`), and production error handling.

---

## Core Capabilities

### 1. Module A: Product Discovery (Strategy)
- **Hierarchical Traceability Matrix:** Direct, real-time parent-to-child linkage connecting strategic initiatives (`IdeaDocument`) to downstream engineering work items (`IssueDocument`).
- **Executive Roll-Up Calculation:** Automated real-time aggregation of child story points, completed story points, and completion percentage.
- **RICE Scoring & Prioritization:** Built-in impact, effort, and RICE scoring models alongside target delivery quarters.
- **Expandable Hierarchy:** Nested sub-table revealing all linked Epics, Stories, Tasks, and Bugs with inline status progression.

### 2. Module B: Agile Delivery (Execution)
- **4-Column Kanban Board:** `To Do`, `In Progress`, `Review`, `Done` with active sprint and story point summaries per column.
- **Instant Status Transitions:** One-click forward and backward status progression directly executing Firestore updates with roll-up re-syncing.
- **Multi-Dimensional Filters:** Filter by Sprint (`sprintId`), Parent Idea (`parentIdeaId`), Issue Type (`type`), and free-text search.

### 3. Live Firebase Firestore Integration
- **Zero Dummy Data:** All state is backed by Firestore `onSnapshot` real-time listeners.
- **Unsubscribe Cleanup:** Proper unmount cleanup hooks preventing memory leaks.
- **One-Click Schema Seeding:** Initial baseline schema documents can be populated directly to Firestore via the UI button.

---

## Getting Started

### 1. Configuration
Copy `.env.example` to `.env.local` and configure your Firebase project credentials:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_DEFAULT_WORKSPACE_ID=WS-123
```

### 2. Run the Development Server
```bash
npm run dev
# or on Windows:
.\run.cmd
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Type Checking & Verification
```bash
npm run typecheck
npm run build
```
Both typecheck and build pass with 0 errors and zero use of `any`.

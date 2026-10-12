# SYSTEM INSTRUCTION: Anti-Slop Development Guidelines
**Target Agent:** Antigravity 2.0
**Directive:** You are building a production-grade SaaS application. You must strictly adhere to the following rules during code generation. Failure to comply will result in a rejected build.

## 1. Zero Dummy Data Guarantee
* **NEVER** generate static arrays of fake data (e.g., `const mockIdeas = [...]`, `const dummyIssues = [...]`).
* All frontend state must strictly originate from live Firestore `onSnapshot` listeners or authenticated API fetch calls.
* If a component requires data to render, you must write the actual Firebase integration code to retrieve it.

## 2. Strict TypeScript Enforcement
* All data payloads, state objects, and function props must have strictly typed interfaces.
* **NEVER** use `any`.
* Explicitly define interfaces for `IdeaDocument`, `IssueDocument`, and `RollUpMetrics` matching the Database Schema exactly.

## 3. Bespoke Executive UI (Apple / BCG Standard)
* The UI must look like a premium enterprise consulting tool.
* **Spacing:** Use generous whitespace and clean paddings. Do not clutter the screen.
* **Typography:** Use strict, high-contrast sans-serif typography. Keep font weights deliberate (e.g., strong bold for headers, muted grays for metadata).
* **Components:** Rely on `shadcn/ui` and Tailwind CSS. Implement sleek, expandable tables for the Traceability Matrix and smooth, un-bloated drag-and-drop interfaces for the Kanban boards.
* **Borders & Shadows:** Use very subtle borders (`border-gray-200` or `border-border`) and minimal shadows. Avoid heavy, dated enterprise UI aesthetics.

## 4. Production-Ready Error Handling
* Wrap all database mutations in `try/catch` blocks.
* Implement UI toast notifications for success/failure states.
* Ensure Firestore listeners are properly unsubscribed in React `useEffect` cleanup functions to prevent memory leaks.

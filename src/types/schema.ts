/**
 * Strict TypeScript interfaces for the Unified Product OS.
 * Strictly adheres to 02_Database_Schema.md and 04_Antislop_Agent_Instructions.md.
 * Absolutely NO usage of `any`.
 */

export interface RollUpMetrics {
  totalStoryPoints: number;
  completedStoryPoints: number;
  progressPercentage: number;
  totalLinkedIssues: number;
}

export type IdeaStatus =
  | "Backlog"
  | "Under Review"
  | "Prioritized"
  | "In Discovery"
  | "Ready for Delivery"
  | "Delivered"
  | "Archived";

export type CustomFieldType =
  | "checkbox"
  | "date"
  | "hyperlink"
  | "multi-select"
  | "number"
  | "people"
  | "rating"
  | "reactions"
  | "select"
  | "text"
  | "slider";

export interface CustomFieldOption {
  id: string;
  label: string;
  color?: string; // e.g. "blue" | "green" | "amber" | "purple" | "slate" | "red"
}

export interface CustomFieldDefinition {
  id: string;
  workspaceId: string;
  name: string;
  type: CustomFieldType;
  description?: string;
  options?: CustomFieldOption[];
  min?: number;
  max?: number;
  visible: boolean;
  order: number;
  createdAt: string;
}

export type CustomFieldValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, boolean>
  | Record<string, number>
  | null
  | undefined;

export interface IdeaDocument {
  ideaId: string;
  workspaceId: string;
  title: string;
  strategicGoal: string;
  status: IdeaStatus | string;
  authorId: string;
  createdAt: string;
  rollUpMetrics: RollUpMetrics;
  description?: string;
  targetQuarter?: string;
  impactScore?: number;
  effortScore?: number;
  riceScore?: number;
  viewId?: string;
  viewIds?: string[];
  context?: string;
  customFields?: Record<string, CustomFieldValue>;
}

export type IssueType = "Epic" | "Story" | "Task" | "Bug";

export type IssueStatus = "To Do" | "In Progress" | "Review" | "Done";

export interface IssueDocument {
  issueId: string;
  workspaceId: string;
  type: IssueType;
  title: string;
  status: IssueStatus;
  storyPoints: number;
  parentIdeaId: string;
  parentEpicId?: string;
  sprintId: string;
  assigneeId: string;
  updatedAt: string;
  description?: string;
  boardId?: string;
}

export type BoardTemplateId =
  | "it-pmo"
  | "ai-champions"
  | "standard-kanban"
  | "scrum-qa"
  | "simple-task";

export interface BoardColumnDefinition {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  statusMapping: IssueStatus;
}

export interface BoardTemplate {
  id: BoardTemplateId;
  name: string;
  description: string;
  columns: BoardColumnDefinition[];
}

export interface BoardDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  templateId: BoardTemplateId;
  columns: BoardColumnDefinition[];
  isDefault?: boolean;
  createdAt: string;
}

export type DiscoveryViewType = "list" | "board" | "matrix";

export interface DiscoveryViewDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  viewType: DiscoveryViewType;
  icon?: string;
  groupBy?: "none" | "status" | "theme" | "roadmap";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filterStatus?: string;
  filterContext?: string;
  visibleFieldIds?: string[];
  isDefault?: boolean;
  createdAt: string;
}

export interface WorkspaceDocument {
  workspaceId: string;
  name: string;
  settings: Record<string, unknown>;
}

export interface SprintDocument {
  sprintId: string;
  workspaceId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "Planned" | "Active" | "Completed";
}

/**
 * Pure calculation logic for Executive Roll-up metrics.
 * Evaluates completion based on Done story points or issue counts if unestimated.
 */
export function calculateRollUpMetrics(issues: IssueDocument[]): RollUpMetrics {
  const totalLinkedIssues = issues.length;
  if (totalLinkedIssues === 0) {
    return {
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      progressPercentage: 0,
      totalLinkedIssues: 0,
    };
  }

  let totalStoryPoints = 0;
  let completedStoryPoints = 0;

  for (const issue of issues) {
    const points = typeof issue.storyPoints === "number" && !isNaN(issue.storyPoints) ? issue.storyPoints : 0;
    totalStoryPoints += points;
    if (issue.status === "Done") {
      completedStoryPoints += points;
    }
  }

  let progressPercentage = 0;
  if (totalStoryPoints > 0) {
    progressPercentage = Math.round((completedStoryPoints / totalStoryPoints) * 1000) / 10;
  } else {
    // If no points estimated, fallback to ratio of completed issues
    const completedCount = issues.filter((i) => i.status === "Done").length;
    progressPercentage = Math.round((completedCount / totalLinkedIssues) * 1000) / 10;
  }

  return {
    totalStoryPoints,
    completedStoryPoints,
    progressPercentage,
    totalLinkedIssues,
  };
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "it-pmo",
    name: "IT PMO Governance Board",
    description: "Corporate PMO lifecycle: Intake, Feasibility, Development, PMO Review, and Delivery.",
    columns: [
      { id: "pmo_intake", title: "Intake & Scope", statusMapping: "To Do", color: "text-slate-500", icon: "CircleDot" },
      { id: "pmo_feasibility", title: "Assessment & Approval", statusMapping: "To Do", color: "text-purple-600", icon: "Bookmark" },
      { id: "pmo_execution", title: "Execution & Delivery", statusMapping: "In Progress", color: "text-blue-600", icon: "Clock" },
      { id: "pmo_review", title: "PMO Governance Review", statusMapping: "Review", color: "text-amber-500", icon: "AlertTriangle" },
      { id: "pmo_done", title: "Delivered & Handover", statusMapping: "Done", color: "text-emerald-600", icon: "CheckCircle2" },
    ],
  },
  {
    id: "ai-champions",
    name: "AI Champions Innovation Board",
    description: "AI/ML innovation lifecycle: Use Cases, PoC, Model Validation, Pilot, and Production.",
    columns: [
      { id: "ai_backlog", title: "AI Use Case Backlog", statusMapping: "To Do", color: "text-indigo-600", icon: "Lightbulb" },
      { id: "ai_poc", title: "PoC & Feasibility", statusMapping: "In Progress", color: "text-blue-600", icon: "Sparkles" },
      { id: "ai_validation", title: "Model Evaluation & QA", statusMapping: "Review", color: "text-amber-500", icon: "AlertTriangle" },
      { id: "ai_pilot", title: "Pilot Deployment", statusMapping: "Review", color: "text-purple-600", icon: "Rocket" },
      { id: "ai_prod", title: "Production Live", statusMapping: "Done", color: "text-emerald-600", icon: "CheckCircle2" },
    ],
  },
  {
    id: "standard-kanban",
    name: "Standard Agile Kanban Board",
    description: "Classic continuous delivery flow: To Do, In Progress, Review, and Done.",
    columns: [
      { id: "kb_todo", title: "To Do", statusMapping: "To Do", color: "text-slate-500", icon: "CircleDot" },
      { id: "kb_inprogress", title: "In Progress", statusMapping: "In Progress", color: "text-blue-600", icon: "Clock" },
      { id: "kb_review", title: "Review", statusMapping: "Review", color: "text-amber-500", icon: "AlertTriangle" },
      { id: "kb_done", title: "Done", statusMapping: "Done", color: "text-emerald-600", icon: "CheckCircle2" },
    ],
  },
  {
    id: "scrum-qa",
    name: "Scrum Sprint & QA Pipeline",
    description: "Structured sprint lifecycle with dedicated QA testing & validation stage.",
    columns: [
      { id: "scrum_backlog", title: "Sprint Backlog", statusMapping: "To Do", color: "text-slate-500", icon: "CircleDot" },
      { id: "scrum_dev", title: "In Development", statusMapping: "In Progress", color: "text-blue-600", icon: "Clock" },
      { id: "scrum_qa", title: "QA Testing & Validation", statusMapping: "Review", color: "text-amber-500", icon: "AlertTriangle" },
      { id: "scrum_done", title: "Accepted / Done", statusMapping: "Done", color: "text-emerald-600", icon: "CheckCircle2" },
    ],
  },
  {
    id: "simple-task",
    name: "Simple Task Board",
    description: "Clean 3-stage board: To Do, Doing, and Done.",
    columns: [
      { id: "simple_todo", title: "To Do", statusMapping: "To Do", color: "text-slate-500", icon: "CircleDot" },
      { id: "simple_doing", title: "Doing", statusMapping: "In Progress", color: "text-blue-600", icon: "Clock" },
      { id: "simple_done", title: "Done", statusMapping: "Done", color: "text-emerald-600", icon: "CheckCircle2" },
    ],
  },
];

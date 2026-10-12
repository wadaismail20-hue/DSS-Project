import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./config";
import {
  IdeaDocument,
  IssueDocument,
  RollUpMetrics,
  calculateRollUpMetrics,
  IssueStatus,
  CustomFieldDefinition,
  CustomFieldOption,
  CustomFieldType,
  CustomFieldValue,
  BoardDefinition,
  BoardTemplateId,
  BOARD_TEMPLATES,
  DiscoveryViewDefinition,
  DiscoveryViewType,
} from "@/types/schema";

/**
 * Strict Document Converter for IdeaDocument
 */
function parseIdeaDoc(snapshot: QueryDocumentSnapshot<DocumentData>): IdeaDocument {
  const data = snapshot.data();
  const rawRollup = data.rollUpMetrics as Partial<RollUpMetrics> | undefined;

  const rollUpMetrics: RollUpMetrics = {
    totalStoryPoints: typeof rawRollup?.totalStoryPoints === "number" ? rawRollup.totalStoryPoints : 0,
    completedStoryPoints: typeof rawRollup?.completedStoryPoints === "number" ? rawRollup.completedStoryPoints : 0,
    progressPercentage: typeof rawRollup?.progressPercentage === "number" ? rawRollup.progressPercentage : 0,
    totalLinkedIssues: typeof rawRollup?.totalLinkedIssues === "number" ? rawRollup.totalLinkedIssues : 0,
  };

  return {
    ideaId: (data.ideaId as string) || snapshot.id,
    workspaceId: (data.workspaceId as string) || "",
    title: (data.title as string) || "Untitled Idea",
    strategicGoal: (data.strategicGoal as string) || "Strategic Objective",
    status: (data.status as string) || "Backlog",
    authorId: (data.authorId as string) || "USER-01",
    createdAt: (data.createdAt as string) || new Date().toISOString(),
    rollUpMetrics,
    description: typeof data.description === "string" ? data.description : undefined,
    targetQuarter: typeof data.targetQuarter === "string" ? data.targetQuarter : undefined,
    impactScore: typeof data.impactScore === "number" ? data.impactScore : undefined,
    effortScore: typeof data.effortScore === "number" ? data.effortScore : undefined,
    riceScore: typeof data.riceScore === "number" ? data.riceScore : undefined,
    viewId: typeof data.viewId === "string" ? data.viewId : undefined,
    viewIds: Array.isArray(data.viewIds) ? (data.viewIds as string[]) : undefined,
    context: typeof data.context === "string" ? data.context : undefined,
    customFields:
      data.customFields && typeof data.customFields === "object"
        ? (data.customFields as Record<string, CustomFieldValue>)
        : undefined,
  };
}

/**
 * Strict Document Converter for CustomFieldDefinition
 */
function parseCustomFieldDoc(snapshot: QueryDocumentSnapshot<DocumentData>): CustomFieldDefinition {
  const data = snapshot.data();
  return {
    id: (data.id as string) || snapshot.id,
    workspaceId: (data.workspaceId as string) || "",
    name: (data.name as string) || "New Field",
    type: (data.type as CustomFieldType) || "text",
    description: typeof data.description === "string" ? data.description : undefined,
    options: Array.isArray(data.options) ? data.options : undefined,
    min: typeof data.min === "number" ? data.min : undefined,
    max: typeof data.max === "number" ? data.max : undefined,
    visible: typeof data.visible === "boolean" ? data.visible : true,
    order: typeof data.order === "number" ? data.order : 0,
    createdAt: (data.createdAt as string) || new Date().toISOString(),
  };
}

/**
 * Strict Document Converter for IssueDocument
 */
function parseIssueDoc(snapshot: QueryDocumentSnapshot<DocumentData>): IssueDocument {
  const data = snapshot.data();

  return {
    issueId: (data.issueId as string) || snapshot.id,
    workspaceId: (data.workspaceId as string) || "",
    type: (data.type as IssueDocument["type"]) || "Story",
    title: (data.title as string) || "Untitled Issue",
    status: (data.status as IssueStatus) || "To Do",
    storyPoints: typeof data.storyPoints === "number" ? data.storyPoints : 0,
    parentIdeaId: (data.parentIdeaId as string) || "",
    parentEpicId: typeof data.parentEpicId === "string" ? data.parentEpicId : undefined,
    sprintId: (data.sprintId as string) || "Backlog",
    assigneeId: (data.assigneeId as string) || "Unassigned",
    updatedAt: (data.updatedAt as string) || new Date().toISOString(),
    description: typeof data.description === "string" ? data.description : undefined,
  };
}

/**
 * Real-time listener for Ideas
 */
export function subscribeToIdeas(
  workspaceId: string,
  onUpdate: (ideas: IdeaDocument[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  try {
    const ideasRef = collection(db, "ideas");
    const q = query(ideasRef, where("workspaceId", "==", workspaceId));

    return onSnapshot(
      q,
      (snapshot) => {
        const ideas: IdeaDocument[] = snapshot.docs.map(parseIdeaDoc);
        onUpdate(ideas);
      },
      (firestoreError) => {
        console.error("Firestore error in subscribeToIdeas:", firestoreError);
        onError(firestoreError);
      }
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError(error);
    return () => {};
  }
}

/**
 * Real-time listener for Issues
 */
export function subscribeToIssues(
  workspaceId: string,
  onUpdate: (issues: IssueDocument[]) => void,
  onError: (error: Error) => void,
  parentIdeaId?: string
): Unsubscribe {
  try {
    const issuesRef = collection(db, "issues");
    const q = parentIdeaId
      ? query(
          issuesRef,
          where("workspaceId", "==", workspaceId),
          where("parentIdeaId", "==", parentIdeaId)
        )
      : query(issuesRef, where("workspaceId", "==", workspaceId));

    return onSnapshot(
      q,
      (snapshot) => {
        const issues: IssueDocument[] = snapshot.docs.map(parseIssueDoc);
        onUpdate(issues);
      },
      (firestoreError) => {
        console.error("Firestore error in subscribeToIssues:", firestoreError);
        onError(firestoreError);
      }
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError(error);
    return () => {};
  }
}

/**
 * Recursively removes all undefined values from an object before sending to Firestore.
 * Firestore strictly rejects undefined field values (e.g. parentEpicId: undefined).
 */
export function cleanFirestoreData<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) {
      continue;
    }
    if (Array.isArray(val)) {
      cleaned[key] = val
        .filter((item) => item !== undefined)
        .map((item) =>
          item !== null && typeof item === "object" && !(item instanceof Date)
            ? cleanFirestoreData(item as Record<string, unknown>)
            : item
        );
    } else if (val !== null && typeof val === "object" && !(val instanceof Date)) {
      cleaned[key] = cleanFirestoreData(val as Record<string, unknown>);
    } else {
      cleaned[key] = val;
    }
  }

  return cleaned;
}

/**
 * Create or replace an Idea in Firestore
 */
export async function createIdea(idea: IdeaDocument): Promise<void> {
  try {
    const docRef = doc(db, "ideas", idea.ideaId);
    const sanitized = cleanFirestoreData(idea as unknown as Record<string, unknown>);
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error creating idea:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Update an existing Idea in Firestore
 */
export async function updateIdea(ideaId: string, updates: Partial<IdeaDocument>): Promise<void> {
  try {
    const docRef = doc(db, "ideas", ideaId);
    const sanitized = cleanFirestoreData(updates as unknown as Record<string, unknown>);
    await updateDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error updating idea:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Delete an Idea from Firestore
 */
export async function deleteIdea(ideaId: string): Promise<void> {
  try {
    const docRef = doc(db, "ideas", ideaId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting idea:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Create or replace an Issue in Firestore
 */
export async function createIssue(issue: IssueDocument): Promise<void> {
  try {
    const docRef = doc(db, "issues", issue.issueId);
    const sanitized = cleanFirestoreData(issue as unknown as Record<string, unknown>);
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error creating issue:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Update an Issue in Firestore
 */
export async function updateIssue(issueId: string, updates: Partial<IssueDocument>): Promise<void> {
  try {
    const docRef = doc(db, "issues", issueId);
    const sanitized = cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
    await updateDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error updating issue:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Update Issue Status (e.g. from Kanban drag or click)
 */
export async function updateIssueStatus(issueId: string, status: IssueStatus): Promise<void> {
  try {
    const docRef = doc(db, "issues", issueId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error updating issue status:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Delete an Issue from Firestore
 */
export async function deleteIssue(issueId: string): Promise<void> {
  try {
    const docRef = doc(db, "issues", issueId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting issue:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Wraps a Firestore write promise with an optimistic window (default 150ms).
 * Firestore updates its local client cache and fires onSnapshot listeners immediately (<5ms).
 * By racing with a small timeout, UI transitions (e.g. closing modals, board updates) occur
 * instantly without hanging on slow corporate network server ACKs.
 */
export async function optimisticWrite(writePromise: Promise<void>, timeoutMs = 150): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });

  try {
    await Promise.race([writePromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Recalculate and persist roll-up metrics for an Idea given its child issues
 */
export async function syncIdeaRollUpMetrics(ideaId: string, childIssues: IssueDocument[]): Promise<void> {
  try {
    const metrics = calculateRollUpMetrics(childIssues);
    const docRef = doc(db, "ideas", ideaId);
    // Use setDoc with merge: true so it gracefully updates existing or creates if not yet committed
    await setDoc(docRef, { rollUpMetrics: metrics }, { merge: true });
  } catch (err) {
    console.error("Error syncing idea roll-up metrics:", err);
  }
}

/**
 * Initialize / Seed standard production schema documents into Firestore.
 * Conforms strictly to 02_Database_Schema.md and PRD requirements.
 */
export async function seedInitialWorkspaceData(workspaceId: string): Promise<void> {
  try {
    // 1. Initial Strategic Ideas from Schema
    const initialIdeas: IdeaDocument[] = [
      {
        ideaId: "IDEA-001",
        workspaceId,
        title: "Energy Monitoring System",
        strategicGoal: "Operational Efficiency & Sustainability",
        status: "In Discovery",
        authorId: "USER-99",
        viewId: "view_it_pmo",
        context: "IT PMO",
        createdAt: "2026-10-08T09:00:00Z",
        targetQuarter: "Q4 2026",
        impactScore: 8,
        effortScore: 5,
        riceScore: 78,
        description: "Enterprise IoT power telemetry and sustainability monitoring across PT. DSS facilities.",
        customFields: {
          cf_insights: 0,
        },
        rollUpMetrics: {
          totalStoryPoints: 13,
          completedStoryPoints: 0,
          progressPercentage: 0,
          totalLinkedIssues: 1,
        },
      },
      {
        ideaId: "IDEA-002",
        workspaceId,
        title: "New rewards program",
        strategicGoal: "Customer Growth & Revenue",
        status: "Prioritized",
        authorId: "USER-99",
        viewId: "view_ai_champions",
        context: "AI Champions",
        createdAt: "2026-10-08T10:00:00Z",
        targetQuarter: "Q3 2026",
        impactScore: 9,
        effortScore: 4,
        riceScore: 90,
        description: "Dynamic customer loyalty tiers and multi-brand promotional redemption rules.",
        customFields: {
          cf_theme: "🌱 Increase revenue",
          cf_roadmap: "Now",
          cf_insights: 2,
        },
        rollUpMetrics: {
          totalStoryPoints: 21,
          completedStoryPoints: 8,
          progressPercentage: 38.1,
          totalLinkedIssues: 3,
        },
      },
      {
        ideaId: "IDEA-003",
        workspaceId,
        title: "Express checkout",
        strategicGoal: "Conversion Optimization",
        status: "Prioritized",
        authorId: "USER-42",
        viewId: "view_it_pmo",
        context: "IT PMO",
        createdAt: "2026-10-08T11:00:00Z",
        targetQuarter: "Q3 2026",
        impactScore: 8,
        effortScore: 3,
        riceScore: 88,
        description: "1-click frictionless payment processing and instant wallet tokenization.",
        customFields: {
          cf_theme: "🌱 Increase revenue",
          cf_roadmap: "Now",
          cf_insights: 1,
        },
        rollUpMetrics: {
          totalStoryPoints: 13,
          completedStoryPoints: 13,
          progressPercentage: 100.0,
          totalLinkedIssues: 2,
        },
      },
      {
        ideaId: "IDEA-004",
        workspaceId,
        title: "Improve waiting list experience",
        strategicGoal: "Customer Satisfaction",
        status: "In Discovery",
        authorId: "USER-12",
        viewId: "view_roadmap",
        context: "Roadmap",
        createdAt: "2026-10-08T12:00:00Z",
        targetQuarter: "Q4 2026",
        impactScore: 7,
        effortScore: 4,
        riceScore: 72,
        description: "Real-time SMS queue telemetry and interactive onboarding for waitlist members.",
        customFields: {
          cf_theme: "❤️ Delight users",
          cf_roadmap: "Next",
          cf_insights: 0,
        },
        rollUpMetrics: {
          totalStoryPoints: 8,
          completedStoryPoints: 0,
          progressPercentage: 0,
          totalLinkedIssues: 1,
        },
      },
      {
        ideaId: "IDEA-005",
        workspaceId,
        title: "Refactor user profile data",
        strategicGoal: "Platform Architecture",
        status: "Backlog",
        authorId: "USER-14",
        viewId: "view_it_pmo",
        context: "IT PMO",
        createdAt: "2026-10-08T13:00:00Z",
        targetQuarter: "Q1 2027",
        impactScore: 6,
        effortScore: 6,
        riceScore: 55,
        description: "Unified customer identity and authorization across all corporate portals.",
        customFields: {
          cf_theme: "❤️ Delight users",
          cf_roadmap: "Later",
          cf_insights: 0,
        },
        rollUpMetrics: {
          totalStoryPoints: 5,
          completedStoryPoints: 0,
          progressPercentage: 0,
          totalLinkedIssues: 1,
        },
      },
      {
        ideaId: "IDEA-006",
        workspaceId,
        title: "Explore VR travel features",
        strategicGoal: "Digital Innovation",
        status: "Backlog",
        authorId: "USER-99",
        viewId: "view_ai_champions",
        context: "AI Champions",
        createdAt: "2026-10-08T14:00:00Z",
        targetQuarter: "Q1 2027",
        impactScore: 5,
        effortScore: 7,
        riceScore: 40,
        description: "Immersive spatial walkthroughs and virtual reality experience previews.",
        customFields: {
          cf_theme: "🚀 Expand horizons",
          cf_roadmap: "Later",
          cf_insights: 0,
        },
        rollUpMetrics: {
          totalStoryPoints: 5,
          completedStoryPoints: 0,
          progressPercentage: 0,
          totalLinkedIssues: 1,
        },
      },
    ];

    // 2. Initial Delivery Issues matching Database Schema exactly
    const initialIssues: IssueDocument[] = [
      {
        issueId: "DEV-101",
        workspaceId,
        type: "Epic",
        title: "Promotional Engine Architecture & Schema",
        status: "Done",
        storyPoints: 13,
        parentIdeaId: "IDEA-001",
        sprintId: "SPRINT-23",
        assigneeId: "USER-14",
        updatedAt: "2026-10-08T09:00:00Z",
        description: "Define multi-tenant database tables and discount validation rules.",
      },
      {
        issueId: "DEV-105",
        workspaceId,
        type: "Story",
        title: "Backend API for Discount Logic",
        status: "In Progress",
        storyPoints: 8,
        parentIdeaId: "IDEA-001",
        parentEpicId: "DEV-101",
        sprintId: "SPRINT-24",
        assigneeId: "USER-42",
        updatedAt: "2026-10-08T11:15:00Z",
        description: "Implement coupon evaluation engine and percentage discount calculations.",
      },
      {
        issueId: "DEV-106",
        workspaceId,
        type: "Story",
        title: "Merchant Portal Promotion Configurator",
        status: "To Do",
        storyPoints: 8,
        parentIdeaId: "IDEA-001",
        parentEpicId: "DEV-101",
        sprintId: "SPRINT-24",
        assigneeId: "USER-77",
        updatedAt: "2026-10-08T10:30:00Z",
        description: "UI view for marketing managers to configure tiered promotional campaigns.",
      },
      {
        issueId: "DEV-107",
        workspaceId,
        type: "Bug",
        title: "Fix Currency Rounding Discrepancy",
        status: "Review",
        storyPoints: 5,
        parentIdeaId: "IDEA-001",
        sprintId: "SPRINT-24",
        assigneeId: "USER-42",
        updatedAt: "2026-10-08T11:45:00Z",
        description: "Ensure IDR calculations round down to nearest whole digit during checkout.",
      },
      {
        issueId: "DEV-201",
        workspaceId,
        type: "Epic",
        title: "IoT Ingestion Pipeline Core",
        status: "Done",
        storyPoints: 5,
        parentIdeaId: "IDEA-002",
        sprintId: "SPRINT-23",
        assigneeId: "USER-88",
        updatedAt: "2026-10-07T16:00:00Z",
        description: "High-throughput MQTT broker and time-series datastore.",
      },
      {
        issueId: "DEV-202",
        workspaceId,
        type: "Task",
        title: "Set up Fleet Telemetry Alert Thresholds",
        status: "In Progress",
        storyPoints: 8,
        parentIdeaId: "IDEA-002",
        parentEpicId: "DEV-201",
        sprintId: "SPRINT-24",
        assigneeId: "USER-12",
        updatedAt: "2026-10-08T08:20:00Z",
        description: "Configurable alert rules for engine temperature and GPS geo-fencing.",
      },
      {
        issueId: "DEV-203",
        workspaceId,
        type: "Story",
        title: "Live GPS Map Operator Console",
        status: "To Do",
        storyPoints: 8,
        parentIdeaId: "IDEA-002",
        sprintId: "SPRINT-25",
        assigneeId: "USER-99",
        updatedAt: "2026-10-08T09:10:00Z",
        description: "Map view showing real-time asset coordinates with status pins.",
      },
      {
        issueId: "DEV-301",
        workspaceId,
        type: "Story",
        title: "Executive Roll-Up Metric Calculation Engine",
        status: "Done",
        storyPoints: 10,
        parentIdeaId: "IDEA-003",
        sprintId: "SPRINT-23",
        assigneeId: "USER-42",
        updatedAt: "2026-10-06T12:00:00Z",
        description: "Automated aggregation of child issue story points to parent ideas.",
      },
      {
        issueId: "DEV-302",
        workspaceId,
        type: "Task",
        title: "Export to BCG Executive PDF Deck",
        status: "Done",
        storyPoints: 8,
        parentIdeaId: "IDEA-003",
        sprintId: "SPRINT-23",
        assigneeId: "USER-14",
        updatedAt: "2026-10-07T11:00:00Z",
        description: "High-contrast printable vector format export for board meetings.",
      },
    ];

    // Write all documents to Firestore
    for (const idea of initialIdeas) {
      await createIdea(idea);
    }
    for (const issue of initialIssues) {
      await createIssue(issue);
    }
    // Seed default custom fields matching Jira Product Discovery
    await seedDefaultCustomFields(workspaceId);
  } catch (err) {
    console.error("Error seeding initial data to Firestore:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Real-time listener for Custom Fields
 */
export function subscribeToCustomFields(
  workspaceId: string,
  onUpdate: (fields: CustomFieldDefinition[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  try {
    const fieldsRef = collection(db, "custom_fields");
    const q = query(fieldsRef, where("workspaceId", "==", workspaceId));

    return onSnapshot(
      q,
      (snapshot) => {
        const fields: CustomFieldDefinition[] = snapshot.docs
          .map(parseCustomFieldDoc)
          .sort((a, b) => a.order - b.order);
        onUpdate(fields);
      },
      (firestoreError) => {
        console.error("Firestore error in subscribeToCustomFields:", firestoreError);
        onError(firestoreError);
      }
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError(error);
    return () => {};
  }
}

/**
 * Create or replace a Custom Field definition
 */
export async function createCustomField(field: CustomFieldDefinition): Promise<void> {
  try {
    const docRef = doc(db, "custom_fields", field.id);
    const sanitized = cleanFirestoreData(field as unknown as Record<string, unknown>);
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error creating custom field:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Update a Custom Field definition
 */
export async function updateCustomField(
  fieldId: string,
  updates: Partial<CustomFieldDefinition>
): Promise<void> {
  try {
    const docRef = doc(db, "custom_fields", fieldId);
    const sanitized = cleanFirestoreData(updates as unknown as Record<string, unknown>);
    await updateDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error updating custom field:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Toggle Custom Field visibility in view
 */
export async function toggleCustomFieldVisibility(fieldId: string, visible: boolean): Promise<void> {
  return updateCustomField(fieldId, { visible });
}

/**
 * Reorder Custom Fields (persist new order indexes in Firestore)
 */
export async function reorderCustomFields(orderedFieldIds: string[]): Promise<void> {
  try {
    const promises = orderedFieldIds.map((id, index) => {
      const docRef = doc(db, "custom_fields", id);
      return updateDoc(docRef, { order: index + 1 });
    });
    await Promise.all(promises);
  } catch (err) {
    console.error("Error reordering custom fields:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Delete a Custom Field definition
 */
export async function deleteCustomField(fieldId: string): Promise<void> {
  try {
    const docRef = doc(db, "custom_fields", fieldId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting custom field:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Update an Idea's specific custom field value
 */
export async function updateIdeaCustomFieldValue(
  ideaId: string,
  fieldId: string,
  value: CustomFieldValue
): Promise<void> {
  try {
    const docRef = doc(db, "ideas", ideaId);
    // Use setDoc with merge: true so it creates or merges into customFields map without failing
    const payload = cleanFirestoreData({
      customFields: {
        [fieldId]: value === undefined ? null : value,
      },
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.error("Error updating idea custom field value:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Add a new option to an existing custom field definition (e.g. adding a checkbox item or select option on the fly)
 */
export async function addCustomFieldOption(
  fieldId: string,
  newOption: CustomFieldOption
): Promise<void> {
  try {
    const docRef = doc(db, "custom_fields", fieldId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const existingOptions = Array.isArray(data.options) ? (data.options as CustomFieldOption[]) : [];
      if (!existingOptions.some((o) => o.id === newOption.id || o.label.toLowerCase() === newOption.label.toLowerCase())) {
        const updatedOptions = [...existingOptions, newOption];
        await updateDoc(docRef, { options: updatedOptions });
      }
    }
  } catch (err) {
    console.error("Error adding option to custom field:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Seed initial standard custom fields matching Jira Product Discovery
 */
export async function seedDefaultCustomFields(workspaceId: string): Promise<void> {
  const defaultFields: CustomFieldDefinition[] = [
    {
      id: "cf_comments",
      workspaceId,
      name: "Comments",
      type: "number",
      description: "Discussion comment count",
      visible: true,
      order: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cf_insights",
      workspaceId,
      name: "Insights",
      type: "number",
      description: "Customer research insights attached",
      visible: true,
      order: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cf_theme",
      workspaceId,
      name: "Theme",
      type: "select",
      description: "Strategic investment theme",
      options: [
        { id: "th_rev", label: "🌱 Increase revenue", color: "green" },
        { id: "th_delight", label: "❤️ Delight users", color: "red" },
        { id: "th_horizons", label: "🚀 Expand horizons", color: "purple" },
      ],
      visible: true,
      order: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cf_roadmap",
      workspaceId,
      name: "Roadmap",
      type: "select",
      description: "Delivery horizon commitment",
      options: [
        { id: "rd_now", label: "Now", color: "blue" },
        { id: "rd_next", label: "Next", color: "sky" },
        { id: "rd_later", label: "Later", color: "purple" },
      ],
      visible: true,
      order: 4,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cf_project_start",
      workspaceId,
      name: "Project start",
      type: "date",
      description: "Planned kick-off date for initiative discovery",
      visible: true,
      order: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cf_project_target",
      workspaceId,
      name: "Project target",
      type: "date",
      description: "Target launch or delivery date",
      visible: true,
      order: 6,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cf_delivery_category",
      workspaceId,
      name: "Delivery Category",
      type: "select",
      description: "Initiative classification category",
      options: [
        { id: "cat_growth", label: "Growth & Revenue", color: "green" },
        { id: "cat_platform", label: "Platform & Infra", color: "blue" },
        { id: "cat_compliance", label: "Compliance & Sec", color: "amber" },
        { id: "cat_cx", label: "Customer Experience", color: "purple" },
      ],
      visible: true,
      order: 7,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cf_documents",
      workspaceId,
      name: "Documents",
      type: "hyperlink",
      description: "Link to PRD, Figma specs, or architecture doc",
      visible: true,
      order: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cf_rating",
      workspaceId,
      name: "Rating",
      type: "rating",
      description: "Senior leadership priority rating (1-5)",
      min: 1,
      max: 5,
      visible: true,
      order: 6,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cf_customer_segment",
      workspaceId,
      name: "Customer Segment",
      type: "multi-select",
      description: "Target enterprise tiers",
      options: [
        { id: "tier_enterprise", label: "Enterprise Tier 1", color: "blue" },
        { id: "tier_smb", label: "Mid-Market SMB", color: "amber" },
        { id: "tier_internal", label: "Internal Subsidiaries", color: "purple" },
      ],
      visible: false,
      order: 7,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const field of defaultFields) {
    await createCustomField(field);
  }
}

/**
 * Strict Document Converter for BoardDefinition
 */
function parseBoardDoc(snapshot: QueryDocumentSnapshot<DocumentData>): BoardDefinition {
  const data = snapshot.data();
  return {
    id: (data.id as string) || snapshot.id,
    workspaceId: (data.workspaceId as string) || "",
    name: (data.name as string) || "Board",
    description: typeof data.description === "string" ? data.description : undefined,
    templateId: (data.templateId as BoardTemplateId) || "standard-kanban",
    columns: Array.isArray(data.columns) ? data.columns : [],
    isDefault: typeof data.isDefault === "boolean" ? data.isDefault : undefined,
    createdAt: (data.createdAt as string) || new Date().toISOString(),
  };
}

/**
 * Real-time listener for Boards
 */
export function subscribeToBoards(
  workspaceId: string,
  onUpdate: (boards: BoardDefinition[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  try {
    const boardsRef = collection(db, "boards");
    const q = query(boardsRef, where("workspaceId", "==", workspaceId));

    return onSnapshot(
      q,
      (snapshot) => {
        const boards: BoardDefinition[] = snapshot.docs.map(parseBoardDoc);
        onUpdate(boards);
      },
      (firestoreError) => {
        console.error("Firestore error in subscribeToBoards:", firestoreError);
        onError(firestoreError);
      }
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError(error);
    return () => {};
  }
}

/**
 * Create or replace a Board definition
 */
export async function createBoard(board: BoardDefinition): Promise<void> {
  try {
    const docRef = doc(db, "boards", board.id);
    const sanitized = cleanFirestoreData(board as unknown as Record<string, unknown>);
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error creating board:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Update a Board definition
 */
export async function updateBoard(
  boardId: string,
  updates: Partial<BoardDefinition>
): Promise<void> {
  try {
    const docRef = doc(db, "boards", boardId);
    const sanitized = cleanFirestoreData(updates as unknown as Record<string, unknown>);
    await updateDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error updating board:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Delete a Board definition
 */
export async function deleteBoard(boardId: string): Promise<void> {
  try {
    const docRef = doc(db, "boards", boardId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting board:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Seed initial standard boards ("IT PMO Board", "AI Champions Board", "Standard Delivery Board")
 */
export async function seedDefaultBoards(workspaceId: string): Promise<void> {
  const pmoTemplate = BOARD_TEMPLATES.find((t) => t.id === "it-pmo")!;
  const aiTemplate = BOARD_TEMPLATES.find((t) => t.id === "ai-champions")!;
  const kbTemplate = BOARD_TEMPLATES.find((t) => t.id === "standard-kanban")!;

  const defaultBoards: BoardDefinition[] = [
    {
      id: "board_it_pmo",
      workspaceId,
      name: "IT PMO Board",
      description: "Enterprise IT PMO governance, stage-gate reviews, and milestone execution.",
      templateId: "it-pmo",
      columns: pmoTemplate.columns,
      createdAt: new Date().toISOString(),
    },
    {
      id: "board_ai_champions",
      workspaceId,
      name: "AI Champions Board",
      description: "AI/ML discovery initiatives, PoC validations, and production model rollouts.",
      templateId: "ai-champions",
      columns: aiTemplate.columns,
      createdAt: new Date().toISOString(),
    },
    {
      id: "board_standard_delivery",
      workspaceId,
      name: "Standard Delivery Board",
      description: "Sprint execution and continuous delivery kanban workflow.",
      templateId: "standard-kanban",
      columns: kbTemplate.columns,
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const board of defaultBoards) {
    await createBoard(board);
  }
}

/**
 * Strict Document Converter for DiscoveryViewDefinition
 */
function parseViewDoc(snapshot: QueryDocumentSnapshot<DocumentData>): DiscoveryViewDefinition {
  const data = snapshot.data();
  return {
    id: (data.id as string) || snapshot.id,
    workspaceId: (data.workspaceId as string) || "",
    name: (data.name as string) || "View",
    description: typeof data.description === "string" ? data.description : undefined,
    viewType: (data.viewType as DiscoveryViewType) || "list",
    icon: typeof data.icon === "string" ? data.icon : undefined,
    groupBy: data.groupBy || "none",
    sortBy: typeof data.sortBy === "string" ? data.sortBy : undefined,
    sortOrder: data.sortOrder || "desc",
    filterStatus: typeof data.filterStatus === "string" ? data.filterStatus : undefined,
    filterContext: typeof data.filterContext === "string" ? data.filterContext : undefined,
    visibleFieldIds: Array.isArray(data.visibleFieldIds) ? data.visibleFieldIds : undefined,
    isDefault: typeof data.isDefault === "boolean" ? data.isDefault : undefined,
    createdAt: (data.createdAt as string) || new Date().toISOString(),
  };
}

/**
 * Real-time listener for Discovery Views
 */
export function subscribeToViews(
  workspaceId: string,
  onUpdate: (views: DiscoveryViewDefinition[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  try {
    const viewsRef = collection(db, "views");
    const q = query(viewsRef, where("workspaceId", "==", workspaceId));

    return onSnapshot(
      q,
      (snapshot) => {
        const views: DiscoveryViewDefinition[] = snapshot.docs.map(parseViewDoc);
        onUpdate(views);
      },
      (firestoreError) => {
        console.error("Firestore error in subscribeToViews:", firestoreError);
        onError(firestoreError);
      }
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError(error);
    return () => {};
  }
}

/**
 * Create or replace a Discovery View
 */
export async function createView(view: DiscoveryViewDefinition): Promise<void> {
  try {
    const docRef = doc(db, "views", view.id);
    const sanitized = cleanFirestoreData(view as unknown as Record<string, unknown>);
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error creating view:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Update a Discovery View
 */
export async function updateView(
  viewId: string,
  updates: Partial<DiscoveryViewDefinition>
): Promise<void> {
  try {
    const docRef = doc(db, "views", viewId);
    const sanitized = cleanFirestoreData(updates as unknown as Record<string, unknown>);
    await updateDoc(docRef, sanitized);
  } catch (err) {
    console.error("Error updating view:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Delete a Discovery View
 */
export async function deleteView(viewId: string): Promise<void> {
  try {
    const docRef = doc(db, "views", viewId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting view:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Seed initial default Discovery Views ("All ideas", "IT PMO View", "AI Champions View", "Roadmap View")
 */
export async function seedDefaultViews(workspaceId: string): Promise<void> {
  const defaultViews: DiscoveryViewDefinition[] = [
    {
      id: "view_all_ideas",
      workspaceId,
      name: "All ideas",
      description: "All ideas in the product backlog. Jira Product Discovery master view.",
      viewType: "list",
      icon: "Target",
      groupBy: "none",
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "view_it_pmo",
      workspaceId,
      name: "IT PMO View",
      description: "Enterprise IT PMO governance, stage-gate reviews, and milestone execution.",
      viewType: "board",
      icon: "Layers",
      filterContext: "IT PMO",
      createdAt: new Date().toISOString(),
    },
    {
      id: "view_ai_champions",
      workspaceId,
      name: "AI Champions View",
      description: "AI/ML discovery initiatives, PoC validations, and production model rollouts.",
      viewType: "board",
      icon: "Sparkles",
      filterContext: "AI Champions",
      createdAt: new Date().toISOString(),
    },
    {
      id: "view_roadmap",
      workspaceId,
      name: "Roadmap (Now / Next / Later)",
      description: "Strategic delivery roadmap grouped by timeframe commitments.",
      viewType: "board",
      icon: "Compass",
      groupBy: "roadmap",
      createdAt: new Date().toISOString(),
    },
  ];

  for (const view of defaultViews) {
    await createView(view);
  }
}

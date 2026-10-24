import { z } from "zod";

export type MasteryLevel = "seen" | "explained" | "practiced" | "independent";
export type NodeStatus = "locked" | "open" | "branched" | "merged";

export interface CurriculumNode {
  id: string; // e.g., "n1", "n3-b1"
  parent: string | null; // null for root nodes, "n3" for branch nodes
  title: string;
  status: NodeStatus;
  mastery: MasteryLevel;
  position: { x: number; y: number };
  context: {
    goal: string;
    practice_task: string;
    explain_prompt: string;
    verification_criteria: string[];
    parent_summary: string;
    known: string[];
    misconception: string | null;
    open_questions: string[];
  };
  user_submission?: {
    hypothesis: string; // "I think ___ works like ___"
    stuck_at: string;   // "but I'm stuck at ___"
    code_or_output: string;
  };
  merge_note_md: string; // Obsidian-compatible markdown with YAML frontmatter
}

export interface PreSurveyData {
  experienceLevel: "beginner" | "intermediate" | "advanced";
  knownPrerequisites: string[];
  preferredDepth: "dynamic" | "short" | "deep";
  confidenceBefore: number; // 1 to 5
}

export interface PostSurveyData {
  completedAt: string;
  synthesisAnswer: string;
  appliedScenarioAnswer: string;
  confidenceBefore: number;
  confidenceAfter: number;
  canTeachFriend: "yes" | "mostly" | "not_yet";
  passedCheck: boolean;
  feedbackSummary: string;
}

export interface KeptFileItem {
  id: string;
  filename: string;
  snippet: string;
  suggestedPrompts: string[];
}

export interface AppState {
  current_node_id: string;
  failed_attempts: number;
  mastered_topics: string[];
  nodes: CurriculumNode[];
  edges: { id: string; source: string; target: string; animated?: boolean }[];
  topic_title?: string;
  pre_survey?: PreSurveyData;
  post_survey?: PostSurveyData;
}

export interface TutorResponse {
  diagnosis: string;
  socratic_question: string;
  next_task: string;
  hint_level: 1 | 2 | 3;
  passed_verification: boolean;
  updated_mastery: MasteryLevel;
  safety_warning: string | null; // Triggered if user code contains destructive shell/fs commands
  spawn_branch: {
    should_spawn: boolean;
    branch_id: string;
    title: string;
    goal: string;
    practice_task: string;
    misconception_identified: string;
  } | null;
  draft_merge_note_md: string | null;
  ai_meta?: {
    source: "live_ai" | "quota_exhausted" | "no_api_key" | "error_fallback";
    model_used: string;
    warning_message: string | null;
  };
}

// Zod Schemas for runtime validation (API routes, JSON state imports, and Markdown note imports)
export const MasteryLevelSchema = z.enum(["seen", "explained", "practiced", "independent"]);
export const NodeStatusSchema = z.enum(["locked", "open", "branched", "merged"]);

export const UserSubmissionSchema = z.object({
  hypothesis: z.string(),
  stuck_at: z.string(),
  code_or_output: z.string(),
});

export const CurriculumNodeSchema = z.object({
  id: z.string().min(1),
  parent: z.string().nullable(),
  title: z.string().min(1),
  status: NodeStatusSchema,
  mastery: MasteryLevelSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  context: z.object({
    goal: z.string(),
    practice_task: z.string(),
    explain_prompt: z.string(),
    verification_criteria: z.array(z.string()),
    parent_summary: z.string(),
    known: z.array(z.string()),
    misconception: z.string().nullable(),
    open_questions: z.array(z.string()),
  }),
  user_submission: UserSubmissionSchema.optional(),
  merge_note_md: z.string(),
});

export const PreSurveyDataSchema = z.object({
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  knownPrerequisites: z.array(z.string()),
  preferredDepth: z.enum(["dynamic", "short", "deep"]),
  confidenceBefore: z.number().min(1).max(5),
});

export const PostSurveyDataSchema = z.object({
  completedAt: z.string(),
  synthesisAnswer: z.string(),
  appliedScenarioAnswer: z.string(),
  confidenceBefore: z.number().min(1).max(5),
  confidenceAfter: z.number().min(1).max(5),
  canTeachFriend: z.enum(["yes", "mostly", "not_yet"]),
  passedCheck: z.boolean(),
  feedbackSummary: z.string(),
});

export const AppStateSchema = z.object({
  current_node_id: z.string(),
  failed_attempts: z.number(),
  mastered_topics: z.array(z.string()),
  nodes: z.array(CurriculumNodeSchema),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      animated: z.boolean().optional(),
    })
  ),
  topic_title: z.string().optional(),
  pre_survey: PreSurveyDataSchema.optional(),
  post_survey: PostSurveyDataSchema.optional(),
});

export const SpawnBranchSchema = z.object({
  should_spawn: z.boolean(),
  branch_id: z.string(),
  title: z.string(),
  goal: z.string(),
  practice_task: z.string(),
  misconception_identified: z.string(),
});

export const AiMetaSchema = z.object({
  source: z.enum(["live_ai", "quota_exhausted", "no_api_key", "error_fallback"]),
  model_used: z.string(),
  warning_message: z.string().nullable(),
});

export const TutorResponseSchema = z.object({
  diagnosis: z.string(),
  socratic_question: z.string(),
  next_task: z.string(),
  hint_level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  passed_verification: z.boolean(),
  updated_mastery: MasteryLevelSchema,
  safety_warning: z.string().nullable(),
  spawn_branch: SpawnBranchSchema.nullable(),
  draft_merge_note_md: z.string().nullable(),
  ai_meta: AiMetaSchema.optional(),
});

export const TutorRequestSchema = z.object({
  node: CurriculumNodeSchema,
  user_submission: UserSubmissionSchema,
  imported_notes_context: z.string().optional().default(""),
  current_branch_depth: z.number().int().min(0).max(1),
  action: z.enum(["diagnose", "verify"]).optional().default("diagnose"),
});

export const ImportedMarkdownSchema = z.object({
  filename: z.string().min(1),
  rawContent: z.string().min(1).max(50000),
});


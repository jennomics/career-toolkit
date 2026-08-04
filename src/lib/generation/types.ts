/**
 * Shared types for the 7-stage generation pipeline.
 */

export type DocumentType = "resume" | "cover-letter" | "essay" | "custom";

export interface GenerationOptions {
  jobId: string;
  documentType: DocumentType;
  packageId?: string;
  options?: {
    strictGaps?: boolean;
  };
}

export interface SpanOutput {
  text: string;
  claimId: string | null;
  modelSupplied: boolean;
}

export interface OverlapInfo {
  overlappingClaims: Array<{
    claimId: string;
    existingDocumentType: string;
    overridden: boolean;
  }>;
  totalChecked: number;
}

export interface PipelineResult {
  success: boolean;
  generationId?: string;
  text?: string;
  spans?: SpanOutput[];
  stage?: PipelineStage;
  error?: string;
  failures?: string[];
  overlap?: OverlapInfo;
}

export interface DeterministicCheckResult {
  passed: boolean;
  failures: string[];
}

export interface CritiqueIssue {
  severity: "critical" | "major" | "minor";
  location: string;
  description: string;
}

export interface CritiqueResult {
  passed: boolean;
  issues: CritiqueIssue[];
}

export enum PipelineStage {
  PREFLIGHT = "preflight",
  CONTEXT_ASSEMBLY = "context_assembly",
  GENERATION = "generation",
  DETERMINISTIC_CHECKS = "deterministic_checks",
  CRITIQUE = "critique",
  REVISION = "revision",
  POST_GENERATION = "post_generation",
}

export interface PreflightResult {
  passed: boolean;
  decomposition: DecompositionData | null;
  mappedQuestions: MappedQuestion[];
  errors: string[];
}

export interface DecompositionData {
  id: string;
  jobId: string;
  problemStatement: string;
  responsibilities: string[];
  statedBars: string[];
  vocabulary: string[];
  hiringQuestions: MappedQuestion[];
}

export interface MappedQuestion {
  question: string;
  rationale: string;
  claimIds: string[];
  gap: boolean;
}

export interface ContextBlock {
  name: string;
  content: string;
  tokenCount: number;
  truncated: boolean;
}

export interface ContextAssemblyResult {
  sessionId: string;
  blocks: ContextBlock[];
  claims: Array<{ id: string; statement: string; category: string }>;
  profileContext: string;
  decomposition: DecompositionData;
}

export interface GenerationResult {
  spans: SpanOutput[];
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  promptTemplateVersion: string;
  temperature: number;
}

export interface RevisionResult {
  success: boolean;
  spans?: SpanOutput[];
  error?: string;
}

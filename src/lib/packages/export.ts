/**
 * Export Gate + Package Finalization (Task 5.9)
 *
 * Pre-export validation system that enforces:
 * - All model-supplied spans must have a final disposition (accepted/rejected)
 * - External claims must be within their freshness window
 * - Confidential/currentEmployer claims must be explicitly accepted
 * - Format validation (word count, no markdown artifacts, no smart quotes)
 */

import { prisma } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlockingIssue {
  check: string;
  detail: string;
  resolution: string;
}

export interface ExportSuccess {
  success: true;
  content: string;
  format: "text" | "markdown";
}

export interface ExportFailure {
  success: false;
  blockingIssues: BlockingIssue[];
}

export type ExportResult = ExportSuccess | ExportFailure;

interface SpanWithRelations {
  id: string;
  generationId: string;
  spanIndex: number;
  text: string;
  claimId: string | null;
  modelSupplied: boolean;
  disposition: string | null;
  claim: {
    id: string;
    artifacts: Array<{
      id: string;
      ingestionDate: Date;
      freshnessWindow: number | null;
      sourceDocumentId: string | null;
      sourceDocument: {
        id: string;
        confidential: boolean;
        currentEmployer: boolean;
      } | null;
    }>;
  } | null;
}

interface GenerationWithSpans {
  id: string;
  documentType: string;
  renderedText: string;
  spans: SpanWithRelations[];
}

// ─── Word Count Limits ───────────────────────────────────────────────────────

const WORD_COUNT_LIMITS: Record<string, { min: number; max: number } | null> = {
  "cover-letter": { min: 250, max: 300 },
  resume: null, // No hard limit
  essay: null, // Flexible
  custom: null, // Flexible
};

// ─── Markdown Artifact Patterns ──────────────────────────────────────────────

const MARKDOWN_PATTERNS = [
  /\*\*[^*]+\*\*/, // bold: **text**
  /\*\*\*[^*]+\*\*\*/, // bold-italic: ***text***
  /^#{1,6}\s/m, // headings: ## text
  /```/, // code fences
];

// Smart quotes (Unicode U+2018-U+201D)
const SMART_QUOTE_PATTERN = /[\u2018\u2019\u201C\u201D]/;

// ─── Core Export Function ────────────────────────────────────────────────────

/**
 * Runs all pre-export validation checks and, if passing, renders
 * the package content in the requested format.
 */
export async function exportPackage(
  packageId: string,
  format: "text" | "markdown"
): Promise<ExportResult> {
  // Load the package with all generations, spans, and claim relations
  const pkg = await prisma.applicationPackage.findUnique({
    where: { id: packageId },
    include: {
      generations: {
        include: {
          spans: {
            orderBy: { spanIndex: "asc" },
            include: {
              claim: {
                include: {
                  artifacts: {
                    include: {
                      sourceDocument: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!pkg) {
    return {
      success: false,
      blockingIssues: [
        {
          check: "package_exists",
          detail: `Package "${packageId}" not found`,
          resolution: "Verify the package ID is correct.",
        },
      ],
    };
  }

  const blockingIssues: BlockingIssue[] = [];

  // Run all pre-export checks
  blockingIssues.push(...checkDispositions(pkg.generations));
  blockingIssues.push(...checkFreshness(pkg.generations));
  blockingIssues.push(...checkConfidentiality(pkg.generations));
  blockingIssues.push(...checkFormat(pkg.generations));

  if (blockingIssues.length > 0) {
    return { success: false, blockingIssues };
  }

  // All checks passed - render the document
  const content =
    format === "text"
      ? renderPlainText(pkg.generations)
      : renderMarkdown(pkg.generations);

  return { success: true, content, format };
}

// ─── Pre-Export Checks ───────────────────────────────────────────────────────

/**
 * Disposition check: all model-supplied spans must have disposition
 * "accepted" or "rejected" (not "pending" or null).
 */
function checkDispositions(generations: GenerationWithSpans[]): BlockingIssue[] {
  const issues: BlockingIssue[] = [];

  for (const gen of generations) {
    for (const span of gen.spans) {
      if (
        span.modelSupplied &&
        span.disposition !== "accepted" &&
        span.disposition !== "rejected"
      ) {
        issues.push({
          check: "disposition",
          detail: `Span "${span.text.slice(0, 50)}..." in ${gen.documentType} has not been reviewed (disposition: ${span.disposition ?? "null"}).`,
          resolution:
            "Review all model-supplied spans and mark each as accepted or rejected before exporting.",
        });
      }
    }
  }

  return issues;
}

/**
 * Freshness check: for each claim used (via spans with claimId), load its
 * ClaimArtifact records. If any artifact has freshnessWindow set and
 * (ingestionDate + freshnessWindow days) < now, the claim is expired.
 */
function checkFreshness(generations: GenerationWithSpans[]): BlockingIssue[] {
  const issues: BlockingIssue[] = [];
  const now = new Date();
  const checkedClaims = new Set<string>();

  for (const gen of generations) {
    for (const span of gen.spans) {
      if (!span.claimId || !span.claim) continue;
      if (checkedClaims.has(span.claimId)) continue;
      checkedClaims.add(span.claimId);

      for (const artifact of span.claim.artifacts) {
        if (artifact.freshnessWindow != null) {
          const expiryDate = new Date(artifact.ingestionDate);
          expiryDate.setDate(expiryDate.getDate() + artifact.freshnessWindow);

          if (expiryDate < now) {
            issues.push({
              check: "freshness",
              detail: `Claim "${span.claimId}" has an expired artifact (ingested ${artifact.ingestionDate.toISOString()}, window: ${artifact.freshnessWindow} days).`,
              resolution:
                "Update or re-verify the claim with fresh evidence before exporting.",
            });
            break; // One expired artifact is enough to flag the claim
          }
        }
      }
    }
  }

  return issues;
}

/**
 * Confidentiality check: for each span's claim, check if any artifact
 * has a sourceDocument with currentEmployer=true or confidential=true.
 * If such claims haven't been explicitly accepted (span disposition must
 * be "accepted"), block export.
 */
function checkConfidentiality(
  generations: GenerationWithSpans[]
): BlockingIssue[] {
  const issues: BlockingIssue[] = [];

  for (const gen of generations) {
    for (const span of gen.spans) {
      if (!span.claimId || !span.claim) continue;

      const hasSensitiveSource = span.claim.artifacts.some(
        (a) =>
          a.sourceDocument &&
          (a.sourceDocument.confidential || a.sourceDocument.currentEmployer)
      );

      if (hasSensitiveSource && span.disposition !== "accepted") {
        issues.push({
          check: "confidentiality",
          detail: `Span using claim "${span.claimId}" references a confidential or current-employer source but has not been explicitly accepted (disposition: ${span.disposition ?? "null"}).`,
          resolution:
            "Explicitly accept or reject spans that reference confidential or current-employer sources.",
        });
      }
    }
  }

  return issues;
}

/**
 * Format validation: word count within limits per document type,
 * no markdown artifacts, no smart quotes.
 */
function checkFormat(generations: GenerationWithSpans[]): BlockingIssue[] {
  const issues: BlockingIssue[] = [];

  for (const gen of generations) {
    // Build the accepted text for this generation
    const acceptedText = gen.spans
      .filter((s) => s.disposition !== "rejected")
      .map((s) => s.text)
      .join(" ");

    // Word count check
    const limits = WORD_COUNT_LIMITS[gen.documentType] ?? null;
    if (limits) {
      const wordCount = countWords(acceptedText);
      if (wordCount < limits.min || wordCount > limits.max) {
        issues.push({
          check: "format",
          detail: `${gen.documentType} has ${wordCount} words (allowed: ${limits.min}-${limits.max}).`,
          resolution: `Adjust the ${gen.documentType} to be between ${limits.min} and ${limits.max} words.`,
        });
      }
    }

    // Markdown artifacts check
    for (const pattern of MARKDOWN_PATTERNS) {
      if (pattern.test(acceptedText)) {
        issues.push({
          check: "format",
          detail: `${gen.documentType} contains markdown formatting artifacts.`,
          resolution:
            "Remove all markdown formatting (**, ***, ##, ```) from the document text.",
        });
        break; // One markdown issue per generation is enough
      }
    }

    // Smart quotes check
    if (SMART_QUOTE_PATTERN.test(acceptedText)) {
      issues.push({
        check: "format",
        detail: `${gen.documentType} contains smart quotes (curly quotes).`,
        resolution:
          "Replace smart quotes with straight quotes or apostrophes.",
      });
    }
  }

  return issues;
}

// ─── Rendering Functions ─────────────────────────────────────────────────────

/**
 * Concatenate rendered text from all accepted spans, strip any residual
 * markdown/formatting.
 */
export function renderPlainText(generations: GenerationWithSpans[]): string {
  const sections: string[] = [];

  for (const gen of generations) {
    const acceptedSpans = gen.spans.filter(
      (s) => s.disposition !== "rejected"
    );
    const text = acceptedSpans.map((s) => s.text).join(" ");
    sections.push(stripMarkdown(text));
  }

  return sections.join("\n\n").trim();
}

/**
 * Format with headings per document type.
 */
export function renderMarkdown(generations: GenerationWithSpans[]): string {
  const sections: string[] = [];

  for (const gen of generations) {
    const heading = documentTypeHeading(gen.documentType);
    const acceptedSpans = gen.spans.filter(
      (s) => s.disposition !== "rejected"
    );
    const text = acceptedSpans.map((s) => s.text).join(" ");
    sections.push(`# ${heading}\n\n${text}`);
  }

  return sections.join("\n\n---\n\n").trim();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function stripMarkdown(text: string): string {
  return (
    text
      // Remove headings (at line start or after whitespace)
      .replace(/(?:^|\n)#{1,6}\s+/g, "\n")
      // Also strip ## patterns that appear mid-line (residual artifacts)
      .replace(/#{1,6}\s+/g, "")
      // Remove bold/italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      // Remove code fences
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      // Remove smart quotes
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .trim()
  );
}

function documentTypeHeading(documentType: string): string {
  switch (documentType) {
    case "cover-letter":
      return "Cover Letter";
    case "resume":
      return "Resume";
    case "essay":
      return "Essay";
    case "custom":
      return "Custom Document";
    default:
      return documentType;
  }
}

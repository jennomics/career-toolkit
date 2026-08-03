# Generation System — Design

Architecture decisions, data model, pipeline topology, and phasing for the
generation system upgrade described in requirements.md.

---

## Design Principles

1. **Claims are first-class entities.** They are not extracted from documents on
   the fly. They exist in the database, have lifecycle states, and are the atoms
   of generation.

2. **Evidence supports claims but doesn't limit them.** An artifact records
   where a fact was observed. The claim's canonical statement is the thing
   generation is allowed to say — in any phrasing consistent with the claim's
   semantics — regardless of how narrowly any single artifact describes it.

3. **Generation is assembly, not invention.** The pipeline selects claims,
   orders them by relevance to the target posting's decomposed questions, frames
   them per document-type policy, and renders prose. It does not conjure new
   facts.

4. **Provenance is structural, not decorative.** Every span in generated output
   carries either a claim_id or a model_supplied marker. This is not metadata
   added afterward — it is the output format.

5. **Cheap checks gate expensive ones.** Deterministic assertions (regex,
   counts, string matching) run before any LLM call. A draft that fails Tier 1
   never reaches the critique model.

6. **Fail loud, never silent.** Missing context blocks generation. Truncated
   retrieval blocks generation. Empty voice corpus blocks generation. The user
   sees a specific error, not a confident-sounding hallucination.

---

## Data Model

### New Models (Prisma schema additions)

```prisma
// ─── Claims Ledger ───────────────────────────────────────────────────────────

model Claim {
  id              String   @id @default(cuid())
  claimKey        String   // Dedup identifier (e.g., "ancestry-team-size")
  statement       String   // Canonical assertion text
  category        String   // numeric, date, attribution, capability, narrative
  status          String   @default("unverified") // verified, unverified, superseded
  supersededById  String?  // FK to the claim that replaced this one
  supersededBy    Claim?   @relation("Supersession", fields: [supersededById], references: [id])
  supersedes      Claim[]  @relation("Supersession")
  lastVerifiedAt  DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  artifacts          ClaimArtifact[]
  negativeAssertions NegativeAssertion[]
  generationSpans    GenerationSpan[]
  corrections        ClaimCorrection[]

  @@unique([claimKey, status]) // Only one active claim per key
  @@index([claimKey])
  @@index([status])
  @@index([category])
}

model ClaimArtifact {
  id               String   @id @default(cuid())
  claimId          String
  claim            Claim    @relation(fields: [claimId], references: [id], onDelete: Cascade)
  sourceDocumentId String?  // FK to SourceDocument if from an uploaded doc
  sourceDocument   SourceDocument? @relation(fields: [sourceDocumentId], references: [id])
  passageText      String   // Verbatim from source
  passageLocation  String?  // Section/page/offset within source
  ingestionDate    DateTime @default(now())
  freshnessWindow  Int?     // Days until stale (null = never expires)

  @@index([claimId])
  @@index([sourceDocumentId])
}

model NegativeAssertion {
  id           String   @id @default(cuid())
  claimId      String   // The correct claim this protects
  claim        Claim    @relation(fields: [claimId], references: [id], onDelete: Cascade)
  forbiddenText String  // String that must never appear in output
  reason       String   // Why this is wrong (human-readable)
  correctedAt  DateTime @default(now())

  @@index([claimId])
}

model ClaimCorrection {
  id            String   @id @default(cuid())
  claimId       String
  claim         Claim    @relation(fields: [claimId], references: [id], onDelete: Cascade)
  previousValue String   // What was wrong
  correctedValue String  // What replaced it
  source        String   // "user-ui", "review", "import"
  createdAt     DateTime @default(now())

  @@index([claimId])
  @@index([createdAt])
}
```

```prisma
// ─── Source Documents ────────────────────────────────────────────────────────

model SourceDocument {
  id            String   @id @default(cuid())
  title         String
  category      String   // work-artifact, third-party-evidence, archived-posting,
                         // prior-application, critique-rejected-draft, compensation-record
  authorship    String   // user-authored, third-party, collaborative, unknown
  authorName    String?  // If third-party, who wrote it
  documentDate  DateTime // When the document was created/published
  uploadDate    DateTime @default(now())
  content       String   // Full text
  confidential  Boolean  @default(false)
  currentEmployer Boolean @default(false) // Extra flag for disclosure-level gating

  artifacts     ClaimArtifact[]
  passages      VoicePassage[]
  retrievalLogs RetrievalLog[]

  @@index([category])
  @@index([authorship])
}
```

```prisma
// ─── Voice Corpus (passage-level) ───────────────────────────────────────────

model VoicePassage {
  id               String   @id @default(cuid())
  sourceDocumentId String?
  sourceDocument   SourceDocument? @relation(fields: [sourceDocumentId], references: [id])
  passageText      String   // The verbatim passage
  topics           String[] // Topic tags for retrieval
  speakerIsUser    Boolean  @default(true) // False if quoting someone else
  createdAt        DateTime @default(now())

  @@index([topics])
  @@index([sourceDocumentId])
}
```

```prisma
// ─── Posting Decomposition ──────────────────────────────────────────────────

model PostingDecomposition {
  id        String   @id @default(cuid())
  jobId     String   @unique
  // The raw extraction
  problemStatement    String   // What problem does this role exist to solve?
  responsibilities    String[] // Named responsibilities
  statedBars          String[] // Explicit bars/requirements
  vocabulary          String[] // Distinctive terms from the posting
  // The hiring questions
  hiringQuestions     Json     // Array of { question, claimIds[], gap: boolean }
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([jobId])
}
```

```prisma
// ─── Generation Records ─────────────────────────────────────────────────────

model GenerationRecord {
  id                  String   @id @default(cuid())
  packageId           String?  // FK to ApplicationPackage
  package             ApplicationPackage? @relation(fields: [packageId], references: [id])
  documentType        String   // resume, cover-letter, essay, custom
  modelId             String   // e.g. "gpt-4o-2024-08-06"
  promptTemplateVersion String // Semver of the prompt template used
  temperature         Float
  retrievalSnapshotId String   // ID linking to the retrieval logs for this generation
  inputTokens         Int
  outputTokens        Int
  durationMs          Int
  // Pipeline stages
  preflightPassed     Boolean
  critiquePassed      Boolean?
  revisedFromId       String?  // If this is a revision, which generation it revised
  // Output
  structuredOutput    Json     // Array of spans with claim attribution
  renderedText        String   // Final prose
  createdAt           DateTime @default(now())

  spans    GenerationSpan[]
  variants GenerationVariant[]

  @@index([packageId])
  @@index([documentType])
  @@index([createdAt])
}

model GenerationSpan {
  id             String   @id @default(cuid())
  generationId   String
  generation     GenerationRecord @relation(fields: [generationId], references: [id], onDelete: Cascade)
  spanIndex      Int      // Order within the document
  text           String
  claimId        String?  // Null = model-supplied
  claim          Claim?   @relation(fields: [claimId], references: [id])
  modelSupplied  Boolean  @default(false)
  disposition    String?  // "accepted", "rejected", "pending" (for export gate)
  paraphrasedFrom String? // Voice passage ID if paraphrasing detected

  @@index([generationId])
  @@index([claimId])
}

model GenerationVariant {
  id           String   @id @default(cuid())
  generationId String
  generation   GenerationRecord @relation(fields: [generationId], references: [id], onDelete: Cascade)
  variantLabel String   // e.g., "keep-bezos-story", "cut-bezos-story"
  tradeoff     String   // Why you'd pick this one
  text         String   // The variant text
  chosen       Boolean  @default(false)

  @@index([generationId])
}
```

```prisma
// ─── Application Packages ───────────────────────────────────────────────────

model ApplicationPackage {
  id              String   @id @default(cuid())
  jobId           String
  name            String   // e.g., "Anthropic Applied AI Manager"
  disclosureLevel String   @default("standard") // standard, redacted, full
  status          String   @default("draft") // draft, in-review, submitted
  submittedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  generations     GenerationRecord[]
  claimUsages     PackageClaimUsage[]

  @@index([jobId])
  @@index([status])
}

model PackageClaimUsage {
  id          String   @id @default(cuid())
  packageId   String
  package     ApplicationPackage @relation(fields: [packageId], references: [id], onDelete: Cascade)
  claimId     String
  documentType String  // Which doc in the package used this claim
  overridden  Boolean  @default(false) // True if reuse was explicitly approved

  @@unique([packageId, claimId, documentType])
  @@index([packageId])
  @@index([claimId])
}
```

```prisma
// ─── Retrieval and Provenance ───────────────────────────────────────────────

model RetrievalLog {
  id               String   @id @default(cuid())
  sessionId        String   // Groups retrievals within one generation session
  sourceDocumentId String?
  sourceDocument   SourceDocument? @relation(fields: [sourceDocumentId], references: [id])
  contextBlock     String   // Which block this retrieval populated (e.g., "voice-corpus", "claims", "profile")
  success          Boolean
  tokenCount       Int?     // How many tokens this block contributed
  truncated        Boolean  @default(false) // Did it get cut?
  error            String?  // If failed, why
  timestamp        DateTime @default(now())

  @@index([sessionId])
  @@index([sourceDocumentId])
  @@index([contextBlock])
}
```

```prisma
// ─── Evaluation Harness ─────────────────────────────────────────────────────

model EvalAssertion {
  id            String   @id @default(cuid())
  tier          Int      // 1 = regression, 2 = property
  assertType    String   // "contains", "not-contains", "property"
  target        String   // The string or property name
  claimId       String?  // Which claim this protects (Tier 1)
  documentTypes String[] // Which doc types this applies to (empty = all)
  correctionDate DateTime? // When the correction that spawned this happened
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())

  @@index([tier])
  @@index([active])
}

model EvalGoldenPackage {
  id             String   @id @default(cuid())
  name           String   // e.g., "Anthropic Manager Frontier AI"
  roleFamily     String   // IC, manager, product, executive
  sector         String   // frontier-ai, big-pharma, cloud-vendor, nonprofit
  postingText    String
  postingDate    DateTime
  claimSnapshot  Json     // Claim IDs available at generation time
  firstGeneration String  // The first generated output
  submittedVersion String // The user-approved final version
  editDiff       String   // Computed diff
  approvedAt     DateTime
  createdAt      DateTime @default(now())

  @@index([roleFamily])
  @@index([sector])
}

model EvalRun {
  id              String   @id @default(cuid())
  goldenPackageId String?
  modelId         String
  promptVersion   String
  temperature     Float
  // Scores
  factScore       Float?   // Tier 1 pass rate (0-1)
  voiceScore      Float?   // Tier 2 property score
  editDistance     Float?   // Primary metric
  anchorDiscrimination Float? // Gap between golden mean and known-bad mean
  // Raw data
  generatedOutput String
  assertionResults Json    // Array of { assertionId, passed, detail }
  createdAt       DateTime @default(now())

  @@index([goldenPackageId])
  @@index([createdAt])
}
```

---

## Pipeline Topology

The generation pipeline runs as a directed sequence of stages. Each stage either
passes (advancing to the next) or fails (returning an error to the caller with
the specific failure reason).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GENERATION PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PRE-FLIGHT                                                               │
│     ├── Check generation readiness (unresolved profile items)                │
│     ├── Resolve posting decomposition (R5)                                   │
│     ├── Map claims to hiring questions — report gaps (R15)                   │
│     ├── Assert non-empty retrieval for all required context blocks (R2.2)    │
│     └── FAIL if: missing evidence, empty voice corpus, unresolved conflicts  │
│                                                                              │
│  2. CONTEXT ASSEMBLY                                                         │
│     ├── Retrieve claims relevant to decomposed questions (R6.2)              │
│     ├── Retrieve voice passages by topic (R3.2)                              │
│     ├── Log every retrieval (R2.1)                                           │
│     ├── Check freshness on external claims (R11.1)                           │
│     ├── Check confidentiality flags (R11.2)                                  │
│     └── FAIL if: any required block is empty or truncated                    │
│                                                                              │
│  3. GENERATION (LLM Call #1)                                                 │
│     ├── System prompt = document-type policy (R7) + voice guidance           │
│     ├── User prompt = ordered claims + context + posting vocabulary          │
│     ├── Output format = JSON array of attributed spans (R2.3)                │
│     ├── Where tradeoff exists → generate variants (R12)                      │
│     └── Record: model, template version, temperature, tokens (R13)           │
│                                                                              │
│  4. DETERMINISTIC CHECKS (no LLM)                                            │
│     ├── Tier 1 regression assertions — block on fail (R14.1)                 │
│     ├── Negative assertion scan — block on match (R1.3)                      │
│     ├── Word/character count vs. document-type limits (R7.3)                 │
│     ├── Contraction rate check (letters/essays only)                         │
│     ├── Markdown artifact scan                                               │
│     ├── Confidentiality string scan (dollar figures, system names)            │
│     ├── Cross-document overlap check within package (R8)                     │
│     └── FAIL if: any regression assertion fails (never reaches critique)     │
│                                                                              │
│  5. CRITIQUE (LLM Call #2)                                                   │
│     ├── Input: generated text + rubric + document-type policy                │
│     ├── Does NOT receive the generation prompt                               │
│     ├── Evaluates: R9.3 rubric checks + R9.4 comprehension                  │
│     ├── Output: structured list of issues with severity and location         │
│     └── PASS if: no critical issues. REVISE if: fixable issues found.        │
│                                                                              │
│  6. REVISION (LLM Call #3, conditional)                                      │
│     ├── Input: original generation + critique findings                       │
│     ├── Revises only affected spans (not full regeneration)                  │
│     ├── Output: same structured span format                                  │
│     └── Re-runs step 4 (deterministic checks) on revised output              │
│                                                                              │
│  7. POST-GENERATION                                                          │
│     ├── Record generation (GenerationRecord + spans)                         │
│     ├── Mark claims as used in package (R8.2)                                │
│     ├── Flag model-supplied spans for disposition (R2.4)                      │
│     ├── Compute property scores (R14.2) — logged, not blocking               │
│     └── Return: rendered text + structured spans + variant options            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Architecture Decisions

### AD1: Claims are populated manually + via guided import, not auto-extracted

Auto-extraction from documents creates phantom claims that were never verified.
The ingestion flow is:

1. User uploads a source document.
2. System proposes claims (LLM-assisted extraction).
3. User confirms, edits, or rejects each proposed claim.
4. Only confirmed claims enter the ledger as "verified."

This prevents the provenance decay that the source session documented (a
document described in detail before being read, facts quoted with confidence
after their source left context).

### AD2: Evidence is append-only; claims are mutable

An artifact is a historical record: "this passage existed in this document on
this date." You can add artifacts to a claim but never delete them (you can
mark them stale via freshness_window). The claim itself can be superseded,
corrected, or re-verified.

### AD3: Span-level output is the only output format

Generation never returns plain prose. It returns `GenerationSpan[]`. The
rendering layer (markdown, PDF, plain text) reads from spans. This makes
provenance tracking structural rather than a post-hoc alignment problem.

If the LLM fails to produce valid span-attributed JSON, the generation fails.
We do not fall back to unattributed prose.

### AD4: Packages own the cross-document constraint

The `ApplicationPackage` model is the unit of cross-document control. When a
claim is used in a resume within a package, that usage is recorded. If the
cover letter generator tries to use the same claim, it's flagged (not blocked —
the user can override). This ensures the "zero shared anecdotes" property
observed in the Sage package.

### AD5: Eval harness is a separate module, not inline

The eval harness lives in `src/lib/eval/` and runs as:
- **Inline (per-generation):** Tier 1 regression assertions and negative
  assertion scans run synchronously as part of step 4. They block.
- **Async (post-generation):** Tier 2 property checks run after generation
  completes and log results. They inform but don't block.
- **Batch (scheduled):** Tier 3 golden packages and variance measurement run
  via a cron job or manual trigger. They measure system health over time.

### AD6: The voice corpus migrates from WritingSample, doesn't replace it

Existing `WritingSample` records become source material for `VoicePassage`
chunking. The migration:
1. Each WritingSample is converted to a `SourceDocument` (category:
   work-artifact, authorship: user-authored).
2. The content is chunked into passages (paragraph-level, with topic inference).
3. Passages are stored as `VoicePassage` rows.
4. The old `getVoiceGuidance()` function is deprecated in favor of
   topic-based passage retrieval.

### AD7: Posting decomposition replaces the current phrase extraction

The existing `JobResponsibility` model (phrases categorized as
responsibility/requirement/qualification) is a subset of what `PostingDecomposition`
provides. The new model adds:
- The problem the role exists to solve
- Hiring questions (the 3-5 questions a reviewer must answer)
- Stated bars (not just nice-to-haves)
- Posting vocabulary (the distinctive terms, separate from keywords)
- Claim mapping (which claims answer which questions)

The existing `JobResponsibility` data is preserved and can seed the
decomposition for already-ingested jobs.

### AD8: Model pinning uses prompt template versioning

Each prompt template (resume system prompt, cover letter system prompt, critique
rubric, etc.) is versioned with a semver string stored in a constants file.
When a template changes, the version bumps. The `GenerationRecord` stores which
version was used, enabling:
- Regression detection: "output got worse after template v2.1.0"
- Reproducibility: re-run any historical generation with exact same inputs
- A/B comparison: run two template versions against the same golden package

---

## Phasing Strategy

The system is built in five phases. Each phase is independently shippable and
provides user-visible value. Later phases depend on earlier ones but the system
works (with reduced capability) at any phase boundary.

### Phase 1: Claims Ledger + Evidence Model

**Ships:** Claim, ClaimArtifact, NegativeAssertion, ClaimCorrection models.
Claim CRUD API. Guided import from existing ProfileMetric and
ExperienceHighlight data. UI for viewing/editing claims.

**User value:** Facts are tracked. Corrections persist. The system can say
"this was already settled" when a generation produces a known-wrong value.

**Dependency:** None. Can ship immediately.

### Phase 2: Posting Decomposition + Gap Detection

**Ships:** PostingDecomposition model. Enhanced posting ingestion that produces
hiring questions. Claim-to-question mapping. Pre-flight gap report.

**User value:** Every new job posting gets a "what do they need to believe about
you?" breakdown. Gaps are named before generation, not discovered in the output.

**Dependency:** Phase 1 (claims must exist to map against questions).

### Phase 3: Generation Pipeline + Provenance

**Ships:** GenerationRecord, GenerationSpan, RetrievalLog models. The seven-
stage pipeline (pre-flight → context assembly → generation → deterministic
checks → critique → revision → post-generation). Span-attributed JSON output.
Negative assertion blocking. Model/template recording.

**User value:** Generation output is traceable. Every sentence links to a claim
or is flagged as model-supplied. The critique pass catches structural issues
before the user sees them.

**Dependency:** Phase 1 (claims for attribution), Phase 2 (decomposition for
ordering).

### Phase 4: Voice Corpus + Document Ingestion

**Ships:** SourceDocument, VoicePassage models. Document upload with authorship/
category. Passage-level chunking with topic tags. Topic-based retrieval for
generation. Migration from existing WritingSample data.

**User value:** Generation uses the user's actual voice. Paraphrased passages
are flagged. The system prefers her phrasing over a smoother rewrite.

**Dependency:** Phase 3 (pipeline must exist to consume passages).

### Phase 5: Packages + Eval Harness + Cross-Document Control

**Ships:** ApplicationPackage, PackageClaimUsage, GenerationVariant models.
EvalAssertion, EvalGoldenPackage, EvalRun models. Cross-document overlap
detection. Variant generation. Edit-distance tracking.

**User value:** Full application packages with coordinated content. Measurable
quality over time. Regression detection. The system proves it's getting better.

**Dependency:** Phase 3 (generation records), Phase 1 (claims for usage
tracking).

---

## File Organization

```
src/
├── lib/
│   ├── claims/
│   │   ├── ledger.ts          # Claim CRUD, conflict detection, supersession
│   │   ├── assertions.ts     # Negative assertion checking
│   │   ├── corrections.ts    # Correction handling, assertion generation
│   │   └── import.ts         # Guided import from existing data
│   ├── decomposition/
│   │   ├── decompose.ts      # LLM-powered posting decomposition
│   │   ├── questions.ts      # Hiring question generation
│   │   └── mapping.ts        # Claim-to-question mapping
│   ├── generation/
│   │   ├── pipeline.ts       # Orchestrates the 7-stage pipeline
│   │   ├── preflight.ts      # Pre-flight checks
│   │   ├── context.ts        # Context assembly + retrieval logging
│   │   ├── generate.ts       # LLM generation call (structured output)
│   │   ├── deterministic.ts  # Tier 1 assertions + string checks
│   │   ├── critique.ts       # LLM critique call
│   │   ├── revise.ts         # LLM revision call
│   │   └── record.ts         # Post-generation recording
│   ├── voice/
│   │   ├── passages.ts       # Passage CRUD, chunking
│   │   ├── retrieval.ts      # Topic-based passage retrieval
│   │   └── migration.ts      # WritingSample → VoicePassage migration
│   ├── documents/
│   │   ├── ingest.ts         # Document upload + claim extraction
│   │   └── categories.ts     # Document category definitions
│   ├── packages/
│   │   ├── package.ts        # Package CRUD
│   │   ├── overlap.ts        # Cross-document overlap detection
│   │   └── export.ts         # Export gate (disposition check, format enforcement)
│   ├── eval/
│   │   ├── assertions.ts     # Tier 1 regression assertion runner
│   │   ├── properties.ts     # Tier 2 property checks
│   │   ├── golden.ts         # Tier 3 golden package runner
│   │   ├── anchors.ts        # Known-bad anchor scoring
│   │   ├── metrics.ts        # Score computation
│   │   └── runner.ts         # Batch eval orchestrator
│   └── prompts/
│       ├── versions.ts       # Prompt template version constants
│       ├── resume.ts         # Resume generation prompt
│       ├── cover-letter.ts   # Cover letter generation prompt
│       ├── critique.ts       # Critique rubric prompt
│       └── decomposition.ts  # Posting decomposition prompt
├── app/api/
│   ├── claims/              # Claim CRUD endpoints
│   ├── documents/           # Document upload + management
│   ├── decomposition/       # Posting decomposition endpoints
│   ├── generation/          # New generation pipeline endpoints
│   ├── packages/            # Package management
│   └── eval/                # Eval harness endpoints
```

---

## Migration Strategy

### Existing data preservation

- `ProfileMetric` rows → seed Claim rows (category: "numeric", status:
  "unverified" until user confirms)
- `ExperienceHighlight` rows → seed Claim rows (category: "capability" or
  "narrative")
- `WritingSample` rows → seed SourceDocument + VoicePassage rows
- `JobResponsibility` rows → preserved; PostingDecomposition adds to them
- `ResumeProject` → preserved as legacy; new generation uses GenerationRecord

### Backward compatibility

The existing `/api/resume/generate` and `/api/resume/project/[id]/cover-letter`
endpoints continue to work during migration. They are deprecated but not
removed until Phase 3 ships a replacement. The new pipeline lives at
`/api/generation/` and is the canonical endpoint once Phase 3 is complete.

---

## Security and Privacy Considerations

- Claims containing PII (phone, email, address) are stored encrypted at rest
  (Neon's encryption) and never included in eval harness outputs.
- Confidentiality flags on SourceDocuments gate what can appear in generated
  output. A document marked `currentEmployer: true` requires explicit
  disposition per claim before any artifact from it enters generation context.
- The eval harness uses only the assertion text (not full generated output) in
  logged results when the generation contains confidential material.
- Export PDFs strip metadata (no model name, no generation ID in file
  properties).

# Generation System — Implementation Tasks

Ordered implementation plan. Each task is a discrete, shippable unit with
acceptance criteria. Tasks within a phase can be parallelized where noted;
cross-phase dependencies are explicit.

Reference: design.md for schema and architecture, requirements.md for the full
requirement each task traces to.

---

## Phase 1: Claims Ledger + Evidence Model

### Task 1.1 — Schema: Claim, ClaimArtifact, NegativeAssertion, ClaimCorrection

**Traces to:** R1.1, R1.2, R1.3, R1.6

**Work:**
- Add Claim, ClaimArtifact, NegativeAssertion, ClaimCorrection models to
  prisma/schema.prisma (as specified in design.md).
- Run prisma db push to create tables.
- Verify relations, indexes, and the unique constraint on [claimKey, status].

**Acceptance criteria:**
- [ ] All four models exist in the database with correct columns and indexes.
- [ ] A Claim can have many ClaimArtifacts (1:N).
- [ ] A Claim can have many NegativeAssertions (1:N).
- [ ] A Claim can self-reference via supersededBy (nullable FK).
- [ ] The unique constraint prevents two active claims with the same claimKey.
- [ ] Prisma generate succeeds and the client types are available.

**Dependencies:** None.


---

### Task 1.2 — Claims CRUD API

**Traces to:** R1.1, R1.4, R1.5

**Work:**
- Create `/api/claims` — GET (list with filters), POST (create).
- Create `/api/claims/[id]` — GET, PATCH (update statement/status), DELETE
  (soft: set status to superseded).
- Create `/api/claims/[id]/artifacts` — GET, POST (add evidence).
- Conflict detection: on create/update, check for existing claims with same
  claimKey and surface conflicts.
- Validation: statement required, claimKey required, category must be one of
  the enum values.

**Acceptance criteria:**
- [ ] POST /api/claims creates a claim and returns it with id.
- [ ] GET /api/claims returns paginated list, filterable by status, category,
      and claimKey.
- [ ] PATCH /api/claims/[id] updates fields and sets updatedAt.
- [ ] Creating a claim with a claimKey that has an existing active claim
      returns a 409 with both claims for user resolution.
- [ ] POST /api/claims/[id]/artifacts attaches evidence without mutating the
      claim's statement.
- [ ] All routes have try/catch with error messages in response body.

**Dependencies:** Task 1.1.

---

### Task 1.3 — Negative Assertions API + Correction Flow

**Traces to:** R1.3, R1.6

**Work:**
- Create `/api/claims/[id]/correct` — POST. Accepts { previousValue,
  correctedValue }. Creates a ClaimCorrection, updates the claim statement,
  creates a NegativeAssertion for the previousValue, and generates an
  EvalAssertion (Tier 1, type: not-contains, target: previousValue).
- Create `/api/claims/[id]/negative-assertions` — GET (list), POST (manual
  add).

**Acceptance criteria:**
- [ ] POST /api/claims/[id]/correct atomically: updates claim, creates
      correction record, creates negative assertion, creates eval assertion.
- [ ] The negative assertion's forbiddenText matches the previousValue exactly.
- [ ] The correction is idempotent: correcting to the same value twice doesn't
      create duplicate assertions.
- [ ] GET /api/claims/[id]/negative-assertions returns all assertions for that
      claim.

**Dependencies:** Task 1.1, Task 1.2.

---

### Task 1.4 — Seed Claims from Existing Data

**Traces to:** R1.1, R1.2 (migration strategy in design.md)

**Work:**
- Create `src/lib/claims/import.ts` with functions:
  - `importFromProfileMetrics()` — each ProfileMetric → Claim (category:
    numeric, status: unverified) + ClaimArtifact (passageText = metric value,
    source = metric source).
  - `importFromExperienceHighlights()` — each ExperienceHighlight → Claim
    (category: capability or narrative) + ClaimArtifact.
- Create a one-time seed script `scripts/seed-claims.ts` that runs both
  imports.
- Do NOT delete original data. Claims are additive.

**Acceptance criteria:**
- [ ] Running seed-claims.ts creates Claim rows from all ProfileMetrics and
      ExperienceHighlights.
- [ ] Each seeded Claim has at least one ClaimArtifact linking back to source.
- [ ] Seeded claims have status "unverified" (user must confirm).
- [ ] Running the script twice is idempotent (checks for existing claimKey
      before inserting).
- [ ] Original ProfileMetric and ExperienceHighlight rows are untouched.

**Dependencies:** Task 1.1, Task 1.2.

---

### Task 1.5 — Claims UI (View + Edit + Correct)

**Traces to:** R1.4, R1.6

**Work:**
- Create `/claims` page with:
  - List view: all claims grouped by category, showing status badges.
  - Conflict indicator: claims sharing a claimKey with different statements.
  - Inline edit: click to edit statement.
  - Correction flow: "This is wrong" button → modal with previous/corrected
    fields → calls POST /api/claims/[id]/correct.
  - Evidence drawer: expand to see all artifacts for a claim.
- Accessible: ARIA labels, keyboard navigation, color contrast for status
  badges.

**Acceptance criteria:**
- [ ] Claims page renders all claims with category grouping.
- [ ] Conflicting claims are visually flagged (warning icon + "Resolve" button).
- [ ] User can correct a claim and the correction appears immediately.
- [ ] Evidence panel shows all artifacts with source document reference.
- [ ] Page works with zero claims (empty state with guidance).
- [ ] All interactive elements are keyboard-accessible.

**Dependencies:** Task 1.2, Task 1.3.


---

## Phase 2: Posting Decomposition + Gap Detection

### Task 2.1 — Schema: PostingDecomposition

**Traces to:** R5

**Work:**
- Add PostingDecomposition model to prisma/schema.prisma (as specified in
  design.md).
- Run prisma db push.
- Verify the unique constraint on jobId (one decomposition per job).

**Acceptance criteria:**
- [ ] PostingDecomposition model exists with all fields.
- [ ] Unique constraint on jobId prevents duplicates.
- [ ] hiringQuestions is stored as Json (array of objects).

**Dependencies:** Phase 1 complete (claims must exist for question mapping).

---

### Task 2.2 — Decomposition LLM Prompt + Service

**Traces to:** R5.1, R5.2

**Work:**
- Create `src/lib/decomposition/decompose.ts`:
  - Input: job description text + job metadata.
  - LLM call (GPT-4o) with structured output requesting:
    - problemStatement: one sentence
    - responsibilities: array of strings
    - statedBars: array of strings (explicit requirements/thresholds)
    - vocabulary: distinctive terms (not generic keywords)
    - hiringQuestions: 3-5 questions with reasoning
  - Falls back to simpler extraction (existing llmParseJob logic) if LLM fails.
- Create `src/lib/prompts/decomposition.ts` with versioned prompt template.

**Acceptance criteria:**
- [ ] Given a job description, returns a PostingDecomposition-shaped object.
- [ ] hiringQuestions contains 3-5 questions, each with a rationale.
- [ ] vocabulary contains terms distinctive to THIS posting (not generic skills
      like "Python" or "leadership").
- [ ] problemStatement is a single sentence identifying the strategic problem.
- [ ] Prompt template version is exported as a constant.
- [ ] Failure returns a structured error, never crashes.

**Dependencies:** Task 2.1.

---

### Task 2.3 — Claim-to-Question Mapping

**Traces to:** R5.2, R15.1

**Work:**
- Create `src/lib/decomposition/mapping.ts`:
  - Input: PostingDecomposition + array of active Claims.
  - For each hiring question, find claims whose statement or artifacts are
    relevant (keyword/semantic matching).
  - Report gaps: questions with zero or weak claim support.
  - Output: hiringQuestions Json updated with claimIds[] and gap: boolean.
- This is the pre-flight coverage check (R15).

**Acceptance criteria:**
- [ ] Each hiring question gets a claimIds array (may be empty).
- [ ] Questions with empty claimIds are flagged as gaps.
- [ ] Mapping uses claim statement + artifact passageText for matching.
- [ ] Returns a structured report: { covered: [...], gaps: [...] }.
- [ ] Does not block on gaps — reports them for user resolution.

**Dependencies:** Task 2.2, Phase 1 (claims exist).

---

### Task 2.4 — Decomposition API + Integration with Job Ingest

**Traces to:** R5.1, R5.3

**Work:**
- Create `/api/decomposition/[jobId]` — GET (retrieve), POST (generate/
  regenerate).
- Modify the existing job save flow: after a job is saved, trigger
  decomposition automatically (async, non-blocking).
- Store posting text snapshot with retrieval date (R5.3).
- Create `/api/decomposition/[jobId]/gaps` — GET. Returns the gap report
  (questions with no claim support).

**Acceptance criteria:**
- [ ] Saving a new job triggers decomposition in the background.
- [ ] GET /api/decomposition/[jobId] returns the stored decomposition.
- [ ] POST /api/decomposition/[jobId] regenerates (e.g., after claims change).
- [ ] GET /api/decomposition/[jobId]/gaps returns gap report with question text
      and missing-claim indicators.
- [ ] Posting text is archived with the date it was ingested.

**Dependencies:** Task 2.2, Task 2.3.

---

### Task 2.5 — Decomposition UI

**Traces to:** R5.2, R10.1

**Work:**
- Add a "Hiring Questions" section to the job detail view:
  - Shows the 3-5 questions with their mapped claims.
  - Gaps highlighted with a "no evidence" indicator.
  - Each question expandable to show supporting claims + artifacts.
- Add the problemStatement as a prominent header on the job detail.
- Show posting vocabulary as a tag cloud (distinct from the existing keywords
  display).

**Acceptance criteria:**
- [ ] Job detail page shows decomposition data when available.
- [ ] Hiring questions display with claim count and gap status.
- [ ] Clicking a question expands to show mapped claims.
- [ ] Gaps are visually distinct (warning color, icon).
- [ ] Loading state while decomposition is in progress.
- [ ] Works when decomposition doesn't exist yet (graceful empty state).

**Dependencies:** Task 2.4.


---

## Phase 3: Generation Pipeline + Provenance

### Task 3.1 — Schema: GenerationRecord, GenerationSpan, RetrievalLog

**Traces to:** R2.1, R2.3, R13.1

**Work:**
- Add GenerationRecord, GenerationSpan, RetrievalLog models to schema.
- Run prisma db push.

**Acceptance criteria:**
- [ ] All three models exist with correct relations.
- [ ] GenerationSpan references both GenerationRecord and Claim (nullable).
- [ ] RetrievalLog has indexes on sessionId and contextBlock.

**Dependencies:** Phase 1 (Claim model exists for the FK).

---

### Task 3.2 — Prompt Template Versioning

**Traces to:** R13.1, AD8

**Work:**
- Create `src/lib/prompts/versions.ts` — exports a version constant for each
  prompt template.
- Create `src/lib/prompts/resume.ts` — extract existing resume system prompt
  into a versioned, exportable template function.
- Create `src/lib/prompts/cover-letter.ts` — same for cover letter.
- Create `src/lib/prompts/critique.ts` — critique rubric prompt (new).
- Create `src/lib/prompts/decomposition.ts` — if not already done in Task 2.2.

**Acceptance criteria:**
- [ ] Each prompt template exports: the prompt text (as a function that accepts
      context parameters), and a VERSION constant (semver string).
- [ ] Existing generation endpoints can import from these modules without
      behavior change.
- [ ] Changing a prompt requires bumping the version (enforced by code comment
      convention, not programmatically).

**Dependencies:** None (can parallelize with Task 3.1).

---

### Task 3.3 — Pre-Flight Stage

**Traces to:** R2.2, R15.1, R15.2

**Work:**
- Create `src/lib/generation/preflight.ts`:
  - Checks generation readiness (existing checkGenerationReady).
  - Verifies PostingDecomposition exists for the target job.
  - Runs claim-to-question mapping and checks for critical gaps.
  - Asserts that required context blocks will be non-empty (profile exists,
    claims exist, voice passages exist if Phase 4 is shipped).
  - Returns: { passed: boolean, failures: string[], gaps: GapReport }.
- Pre-flight BLOCKS generation if passed=false. Returns the failure list to
  the caller.

**Acceptance criteria:**
- [ ] Returns passed=true when all required context is available.
- [ ] Returns passed=false with specific failure reasons when context is
      missing.
- [ ] Gaps are reported but do not block (unless user has set strict mode).
- [ ] Missing decomposition triggers decomposition (non-blocking) and returns
      a "decomposition in progress, retry" response.
- [ ] Empty claim set for a job blocks generation with a clear message.

**Dependencies:** Task 3.1, Phase 2 (decomposition).

---

### Task 3.4 — Context Assembly + Retrieval Logging

**Traces to:** R2.1, R2.2, R6.1, R6.2

**Work:**
- Create `src/lib/generation/context.ts`:
  - Generates a unique sessionId for this generation run.
  - Retrieves claims ordered by relevance to hiring questions (from
    decomposition).
  - Retrieves profile context (existing getProfileContext, enhanced).
  - Retrieves voice passages by topic (stub until Phase 4; uses existing
    WritingSample in interim).
  - Logs every retrieval to RetrievalLog: document, block name, success,
    token count, truncation status.
  - Validates: no required block is empty, no block was truncated without
    acknowledgment.
  - Returns: assembled context object + sessionId.

**Acceptance criteria:**
- [ ] Every retrieval creates a RetrievalLog entry.
- [ ] Token counts are computed for each context block.
- [ ] If a block is empty, assembly fails with the block name in the error.
- [ ] If a block is truncated, a RetrievalLog with truncated=true is created.
- [ ] Claims are ordered by question relevance, not by creation date.
- [ ] sessionId links all retrievals for one generation together.

**Dependencies:** Task 3.1, Task 3.3.

---

### Task 3.5 — Structured Generation (LLM Call #1)

**Traces to:** R2.3, R6.3, R7.1, R12.1

**Work:**
- Create `src/lib/generation/generate.ts`:
  - Accepts: assembled context, document type, prompt template.
  - Constructs system prompt from document-type policy + voice guidance.
  - Constructs user prompt from ordered claims + posting vocabulary.
  - Calls LLM with JSON mode requesting span-attributed output:
    ```json
    { "spans": [{ "text": "...", "claimId": "..." | null, "modelSupplied": true|false }] }
    ```
  - Validates response: spans must reconstruct to coherent text, every span
    must have either claimId or modelSupplied=true.
  - If validation fails, retries once with a clarification prompt. If second
    attempt fails, generation fails (no fallback to unattributed prose).
  - Records: model, template version, temperature, token counts.
  - Where tradeoffs exist (detected via prompt engineering), returns variants.

**Acceptance criteria:**
- [ ] Output is an array of spans with attribution.
- [ ] Concatenating span texts produces readable prose.
- [ ] Every span has either a valid claimId (exists in DB) or modelSupplied=true.
- [ ] Invalid LLM response triggers one retry, then fails with specific error.
- [ ] GenerationRecord is created with all metadata fields populated.
- [ ] Temperature, model, and prompt version are recorded.

**Dependencies:** Task 3.2, Task 3.4.

---

### Task 3.6 — Deterministic Checks (Step 4)

**Traces to:** R1.3, R9.2, R14.1

**Work:**
- Create `src/lib/generation/deterministic.ts`:
  - Tier 1 regression assertions: load all active EvalAssertions (tier=1),
    run contains/not-contains checks against rendered text.
  - Negative assertion scan: load all NegativeAssertions, check rendered text.
  - Word/character count vs. document-type limits.
  - Contraction rate (for letters/essays: must be above floor).
  - Markdown artifact scan (no **, no ***, no smart quotes in plain-text
    output).
  - Confidentiality string scan (dollar figures, internal system names from
    claims marked confidential).
  - Returns: { passed: boolean, failures: DeterministicFailure[] }.
- A failure here BLOCKS the generation. It never reaches critique.

**Acceptance criteria:**
- [ ] All active Tier 1 assertions are checked on every generation.
- [ ] A negative assertion match returns the claim_id and correction date in
      the failure message.
- [ ] Word count check uses the document type's configured limit.
- [ ] Contraction rate is only enforced for letter/essay types.
- [ ] Confidentiality scan catches dollar amounts (regex: $[0-9]+) and known
      internal system names.
- [ ] Returns detailed failure messages (which assertion, what was found, where
      in the text).

**Dependencies:** Task 3.5, Task 1.3 (negative assertions exist).


---

### Task 3.7 — Critique Pass (LLM Call #2)

**Traces to:** R9.1, R9.3, R9.4

**Work:**
- Create `src/lib/generation/critique.ts`:
  - Input: rendered text + document-type policy + critique rubric.
  - Does NOT receive the generation prompt or the claims context.
  - LLM call evaluates against the rubric checks listed in R9.3.
  - Output: structured JSON array of issues:
    ```json
    [{ "check": "rule-of-three", "severity": "warning"|"critical",
       "location": "paragraph 3", "detail": "..." }]
    ```
  - Comprehension check (R9.4): flags phrases with high abstraction.
  - Returns: { passed: boolean (no critical issues), issues: Issue[] }.

**Acceptance criteria:**
- [ ] Critique receives only the text and rubric, not the generation context.
- [ ] Each rubric check from R9.3 is explicitly requested in the prompt.
- [ ] Issues include severity (critical blocks, warning informs).
- [ ] Comprehension flag identifies specific phrases.
- [ ] A generation with zero critical issues passes critique without revision.
- [ ] Critique prompt template is versioned (src/lib/prompts/critique.ts).

**Dependencies:** Task 3.5, Task 3.2.

---

### Task 3.8 — Revision Pass (LLM Call #3)

**Traces to:** R9.1

**Work:**
- Create `src/lib/generation/revise.ts`:
  - Input: original spans + critique issues.
  - Revises ONLY the affected spans (identified by location in critique).
  - Output: updated span array (same format as generation output).
  - The revised output re-runs Task 3.6 (deterministic checks). If it fails
    again, the generation fails entirely (no infinite loop).
  - Records a new GenerationRecord with revisedFromId pointing to the original.

**Acceptance criteria:**
- [ ] Only spans flagged by critique are revised (others unchanged).
- [ ] Revised output maintains span attribution (claim_ids preserved).
- [ ] Deterministic checks re-run on revised output.
- [ ] Maximum one revision pass (no loops). Second failure = generation fails.
- [ ] The revision GenerationRecord links back to the original via revisedFromId.

**Dependencies:** Task 3.6, Task 3.7.

---

### Task 3.9 — Pipeline Orchestrator

**Traces to:** All of Phase 3

**Work:**
- Create `src/lib/generation/pipeline.ts`:
  - Orchestrates: preflight → context → generate → deterministic → critique →
    revise (if needed) → post-generation recording.
  - Each stage returns a result or throws a typed error.
  - On failure at any stage, returns the stage name + error detail.
  - On success, returns: rendered text, structured spans, variants (if any),
    generation record ID, property scores (logged async).
- Create `/api/generation/run` — POST endpoint that invokes the pipeline.
  - Body: { jobId, documentType, options?: { strictGaps?: boolean } }
  - Returns: { success, generationId, text, spans, variants?, failures? }

**Acceptance criteria:**
- [ ] A successful run returns rendered text + spans + generation record ID.
- [ ] A failure at any stage returns { success: false, stage, error }.
- [ ] The endpoint is idempotent (running twice for the same job creates two
      independent generation records).
- [ ] Property checks (Tier 2) run async after the response is sent.
- [ ] End-to-end latency for a successful 3-call run is under 60 seconds.
- [ ] Model ID in GenerationRecord matches the actual model used (not just
      the requested model, in case of fallback).

**Dependencies:** Tasks 3.3–3.8.


---

## Phase 4: Voice Corpus + Document Ingestion

### Task 4.1 — Schema: SourceDocument, VoicePassage

**Traces to:** R3.1, R4.1, R4.3

**Work:**
- Add SourceDocument and VoicePassage models to schema (as specified in
  design.md).
- Run prisma db push.

**Acceptance criteria:**
- [ ] Both models exist with correct columns, indexes, and relations.
- [ ] VoicePassage has a topics array field (PostgreSQL text[]).
- [ ] SourceDocument has the six-category enum enforced via validation (not
      DB enum, for flexibility).

**Dependencies:** Phase 1 (ClaimArtifact references SourceDocument).

---

### Task 4.2 — Document Upload API

**Traces to:** R4.1, R4.2

**Work:**
- Create `/api/documents` — GET (list), POST (upload).
- Create `/api/documents/[id]` — GET, PATCH, DELETE.
- POST accepts: title, content (text), category, authorship, authorName
  (if third-party), documentDate, confidential flag.
- Authorship and documentDate are REQUIRED (R4.1) — validation rejects
  without them.
- On upload, trigger claim extraction (propose claims from document content,
  stored as unverified until user confirms — AD1).

**Acceptance criteria:**
- [ ] Upload requires title, content, category, authorship, documentDate.
- [ ] Missing required fields returns 400 with specific field names.
- [ ] Documents marked not-authored-by-user are flagged in the response.
- [ ] List endpoint supports filtering by category and authorship.
- [ ] Upload returns the created document with its ID.

**Dependencies:** Task 4.1.

---

### Task 4.3 — Passage Chunking + Topic Inference

**Traces to:** R3.1, R3.2

**Work:**
- Create `src/lib/voice/passages.ts`:
  - `chunkDocument(content: string)`: splits into paragraph-level passages.
    Preserves paragraph boundaries. Minimum passage length: 50 chars (skip
    headings, empty lines). Maximum: 500 chars (split long paragraphs at
    sentence boundaries).
  - `inferTopics(passage: string)`: LLM call (GPT-4o-mini) to assign 1-3
    topic tags per passage. Topics are drawn from a controlled vocabulary
    initially seeded from existing skill categories + role domains.
  - `ingestDocument(documentId: string)`: loads document, chunks it, infers
    topics, creates VoicePassage rows.
- Only documents with authorship = "user-authored" AND speakerIsUser = true
  are eligible for voice retrieval (R4.1).

**Acceptance criteria:**
- [ ] A 2000-word document produces 10-30 passages (paragraph-level).
- [ ] Each passage has 1-3 topic tags.
- [ ] Topics come from inference, not hard-coded categories.
- [ ] Passages from non-user-authored documents have speakerIsUser=false.
- [ ] Running ingest twice for the same document is idempotent (deletes old
      passages first, then re-creates).

**Dependencies:** Task 4.1, Task 4.2.

---

### Task 4.4 — Topic-Based Passage Retrieval

**Traces to:** R3.2, R3.3

**Work:**
- Create `src/lib/voice/retrieval.ts`:
  - `retrievePassages(topics: string[], limit: number)`: queries VoicePassage
    where topics overlap with requested topics, ordered by relevance (number
    of matching topics), limited to N passages.
  - Only retrieves passages where speakerIsUser=true.
  - Logs retrieval to RetrievalLog (contextBlock: "voice-corpus").
  - If zero passages match, returns empty (caller decides whether to abort).
- Integrate into generation context assembly (Task 3.4): replace the existing
  WritingSample truncation with topic-based passage retrieval.

**Acceptance criteria:**
- [ ] Retrieval returns passages ranked by topic overlap.
- [ ] Only user-authored passages are returned.
- [ ] Each retrieval creates a RetrievalLog entry.
- [ ] Empty retrieval returns [] (does not throw).
- [ ] Integration with context assembly replaces the old 500-char truncation.

**Dependencies:** Task 4.3, Task 3.4 (context assembly exists).

---

### Task 4.5 — WritingSample Migration

**Traces to:** AD6 (design.md)

**Work:**
- Create `src/lib/voice/migration.ts`:
  - For each existing WritingSample: create a SourceDocument (category:
    work-artifact, authorship: user-authored, documentDate: createdAt).
  - Run chunkDocument + inferTopics on each.
  - Create VoicePassage rows.
- Create a migration script `scripts/migrate-writing-samples.ts`.
- Deprecate (but don't remove) the existing getVoiceGuidance function.
  Add a console.warn when it's called suggesting the new retrieval path.

**Acceptance criteria:**
- [ ] Each WritingSample becomes a SourceDocument + N VoicePassages.
- [ ] Migration is idempotent (tracks which samples have been migrated via a
      marker, e.g., a sourceDocumentId back-reference).
- [ ] Old WritingSample data is NOT deleted.
- [ ] getVoiceGuidance logs a deprecation warning.
- [ ] New passages are retrievable via topic-based retrieval.

**Dependencies:** Task 4.3, Task 4.4.

---

### Task 4.6 — Document Management UI

**Traces to:** R4.1, R4.2, R4.3

**Work:**
- Create `/documents` page:
  - Upload form with required fields (title, category dropdown, authorship
    radio, date picker, content textarea or file upload).
  - List view grouped by category.
  - Document detail view showing: metadata, passages (if chunked), linked
    claims.
  - Coverage report (R4.2): when viewing a document set, show which documents
    have been read/chunked vs. pending.
- Accessible: all form controls labeled, keyboard navigable, error states
  announced.

**Acceptance criteria:**
- [ ] Document upload form enforces required fields client-side and server-side.
- [ ] Category dropdown shows all six categories.
- [ ] Authorship selection shows "I wrote this" / "Someone else wrote this"
      with authorName field appearing conditionally.
- [ ] List view shows document count per category.
- [ ] Document detail shows passage count and linked claim count.

**Dependencies:** Task 4.2, Task 4.3.


---

## Phase 5: Packages + Eval Harness + Cross-Document Control

### Task 5.1 — Schema: ApplicationPackage, PackageClaimUsage, GenerationVariant

**Traces to:** R8.1, R8.2, R12.2

**Work:**
- Add ApplicationPackage, PackageClaimUsage, GenerationVariant models to
  schema.
- Run prisma db push.

**Acceptance criteria:**
- [ ] All three models exist with correct relations and indexes.
- [ ] PackageClaimUsage has the unique constraint on [packageId, claimId,
      documentType].
- [ ] GenerationVariant links to GenerationRecord.

**Dependencies:** Phase 3 (GenerationRecord exists).

---

### Task 5.2 — Package CRUD + Cross-Document Overlap Detection

**Traces to:** R8.1, R8.2, R8.3

**Work:**
- Create `/api/packages` — GET, POST (create package linked to a jobId).
- Create `/api/packages/[id]` — GET (with generations and claim usage), PATCH,
  DELETE.
- Create `src/lib/packages/overlap.ts`:
  - After generation, record all claim_ids used in PackageClaimUsage.
  - Before generating a sibling document in the same package, check which
    claims are already used. Flag overlaps in the generation context (the
    generator can still use them but must explicitly override).
  - Intra-document check: scan spans for repeated claim_ids or semantically
    similar text appearing more than twice.

**Acceptance criteria:**
- [ ] Creating a package returns its ID and links to a job.
- [ ] After generation, PackageClaimUsage rows are created for every claim
      used.
- [ ] Generating a second document in the same package flags already-used
      claims.
- [ ] Intra-document repetition detection finds same claim used 3+ times.
- [ ] Overlap report is returned as part of the generation response.

**Dependencies:** Task 5.1, Task 3.9 (pipeline exists).

---

### Task 5.3 — Variant Generation + Tracking

**Traces to:** R12.1, R12.2

**Work:**
- Enhance the generation step (Task 3.5) to detect tradeoff points and
  produce variants.
- Create `/api/generation/[id]/variants` — GET (list), POST (choose a variant).
- When a variant is chosen, update GenerationVariant.chosen=true and record
  the selection.
- Variant selection signal is stored for future ordering (training data).

**Acceptance criteria:**
- [ ] Generation can produce 2-3 variants for a tradeoff point.
- [ ] Each variant has a label and a one-sentence tradeoff explanation.
- [ ] POST to choose a variant marks it as chosen and unmarks others.
- [ ] Variant choice history is queryable (for future analysis).

**Dependencies:** Task 5.1, Task 3.5.

---

### Task 5.4 — Schema: EvalAssertion, EvalGoldenPackage, EvalRun

**Traces to:** R14.1, R14.3, R14.6

**Work:**
- Add EvalAssertion, EvalGoldenPackage, EvalRun models to schema.
- Run prisma db push.
- Seed the initial Tier 1 assertions from the table in requirements.md (8 seed
  rows from the source session).

**Acceptance criteria:**
- [ ] All three eval models exist.
- [ ] EvalAssertion supports both "contains" and "not-contains" types.
- [ ] Seed script creates the 8 initial assertions from requirements.md.
- [ ] EvalGoldenPackage can store full posting text and generation outputs.

**Dependencies:** Phase 1 (assertions reference claims).

---

### Task 5.5 — Eval Runner: Tier 1 + Provenance Tests

**Traces to:** R14.1, R14.5

**Work:**
- Create `src/lib/eval/assertions.ts`:
  - Loads all active Tier 1 assertions.
  - Runs contains/not-contains checks against a given text.
  - Returns: { passed: boolean, results: AssertionResult[] }.
- Create `src/lib/eval/provenance.ts`:
  - Test: generation citing a document with no retrieval log → must fail.
  - Test: model-supplied claim reused across 3 docs → must NOT acquire verified
    status.
  - Test: external claim past freshness window → must block export.
- Create `src/lib/eval/runner.ts`:
  - Orchestrates a full eval run against a golden package.
  - Records results in EvalRun.

**Acceptance criteria:**
- [ ] Tier 1 runner catches all seed assertion violations.
- [ ] Provenance test correctly fails a generation that cites an unretrieved
      document.
- [ ] Freshness test blocks export for an expired external claim.
- [ ] EvalRun records are created with all score fields.
- [ ] Runner is callable from both the API and a batch script.

**Dependencies:** Task 5.4, Task 3.9.

---

### Task 5.6 — Eval Runner: Tier 2 Property Checks

**Traces to:** R14.2

**Work:**
- Create `src/lib/eval/properties.ts`:
  - Contraction rate calculator (count contractions / total words).
  - Rule-of-three detector (regex for parallel three-item lists).
  - Landing detector (last sentence of each paragraph: is it short +
    declarative?).
  - Posting-vocabulary overlap (compare posting vocabulary from decomposition
    against generated text — flag matches).
  - Exhibit adjacency (for each capability claim, check if a specific instance
    appears within 2 sentences).
  - Intra-document repetition (semantic similarity of sentences, flag pairs
    above threshold).
  - Comprehension flag (sentences with high abstraction + low corpus support).
- Each check returns: violations per 1000 words, with locations.

**Acceptance criteria:**
- [ ] Contraction rate returns a percentage and compares against floor (25%
      for letters).
- [ ] Rule-of-three detector finds "X, Y, and Z" patterns in prose.
- [ ] Landing detector identifies short closing sentences.
- [ ] Vocabulary overlap flags specific leaked terms.
- [ ] All checks return structured results (check name, location, detail).
- [ ] Checks are skippable per document type (e.g., contraction rate skipped
      for resumes).

**Dependencies:** Task 5.4.


---

### Task 5.7 — Eval Runner: Golden Packages + Known-Bad Anchors

**Traces to:** R14.3, R14.4

**Work:**
- Create `src/lib/eval/golden.ts`:
  - Runs a golden package: generates output N times (configurable, default 3),
    computes edit distance from each to the submitted version, computes
    variance.
  - Stores results in EvalRun.
- Create `src/lib/eval/anchors.ts`:
  - Scores known-bad anchors using the same property checks.
  - If any anchor scores above the passing threshold, the entire run fails.
  - Computes anchor discrimination (gap between golden mean and anchor mean).
- Create `/api/eval/run` — POST. Triggers a batch eval (all golden packages
  + anchors). Returns run IDs for polling.
- Create `/api/eval/results` — GET. Returns historical eval results with
  trend data.

**Acceptance criteria:**
- [ ] Golden package runner generates N outputs and computes edit distance.
- [ ] Variance is computed across the N runs.
- [ ] Known-bad anchors score below the passing threshold (or the run fails).
- [ ] Anchor discrimination metric is computed and stored.
- [ ] Batch endpoint is non-blocking (returns immediately, runs async).
- [ ] Results endpoint shows trends over time.

**Dependencies:** Task 5.5, Task 5.6.

---

### Task 5.8 — Scoring Split + Metrics Dashboard

**Traces to:** R14.6, R14.7

**Work:**
- Create `src/lib/eval/metrics.ts`:
  - Computes: edit distance (primary), regression pass rate, property
    violations per 1000 words, anchor discrimination, variance.
  - Fact score and voice score computed SEPARATELY (R14.7). They never
    aggregate.
  - A high voice score with a failing fact assertion = overall FAIL.
- Create `/eval` page (or section in admin):
  - Shows current scores with trend sparklines.
  - Separate fact and voice/structure sections.
  - Highlights regressions (score worse than previous run).
  - Shows the primary metric (edit distance) prominently.

**Acceptance criteria:**
- [ ] Fact and voice scores are separate numbers, never combined.
- [ ] A generation that passes all voice checks but fails one fact assertion
      is marked as failed.
- [ ] Edit distance is computed as character-level Levenshtein normalized to
      document length.
- [ ] Dashboard shows last 10 eval runs with trend direction.
- [ ] Regression alerts are visually prominent (red indicators).

**Dependencies:** Task 5.7.

---

### Task 5.9 — Export Gate + Package Finalization

**Traces to:** R2.4, R7.3, R11.1, R11.2

**Work:**
- Create `src/lib/packages/export.ts`:
  - Pre-export checks:
    - All model-supplied spans have a disposition (accepted/rejected).
    - No unverified spans remain (or user has explicitly accepted them).
    - Freshness: all external claims within their window.
    - Confidentiality: all flagged claims have been dispositioned.
    - Format: word count within limits, no markdown artifacts, no smart quotes.
  - Export formats: plain text, markdown, PDF (with selectable text for ATS).
  - PDF generation uses a headless renderer (e.g., puppeteer or react-pdf)
    that produces selectable text, not images.
- Create `/api/packages/[id]/export` — POST. Runs the gate, returns the
  document or the list of blocking issues.

**Acceptance criteria:**
- [ ] Export blocked if any model-supplied span has no disposition.
- [ ] Export blocked if any external claim is past freshness window.
- [ ] Export blocked if any confidential claim is undispositioned.
- [ ] Plain text export has no markdown artifacts.
- [ ] PDF export has selectable, copy-pasteable text.
- [ ] Word count is validated against document-type limit before export.
- [ ] Blocking issues are returned as a structured list with resolution
      instructions.

**Dependencies:** Task 5.2, Task 3.9.

---

## Cross-Cutting Tasks (Any Phase)

### Task X.1 — Gap Naming Enhancement

**Traces to:** R10.1, R10.2

**Work:**
- Enhance the existing gap analysis to use hiring questions (from
  PostingDecomposition) instead of keyword matching.
- For each gap (question with no claim), generate a suggested passage:
  one-sentence acknowledgment + strongest adjacent claim.
- Create `/api/generation/gaps` — POST. Returns gap passages for user
  approval.

**Acceptance criteria:**
- [ ] Gaps are identified from hiring questions, not keywords.
- [ ] Each gap passage is a concrete suggestion (not generic advice).
- [ ] Never fabricates coverage for an unmet bar.
- [ ] User can accept, edit, or decline each suggested passage.

**Dependencies:** Phase 2 (decomposition with questions).

---

### Task X.2 — Retargeting Diff View

**Traces to:** R6.4

**Work:**
- When generating for a new job using an existing claim set:
  - Compute a structural diff: what claims moved position, what got reframed,
    what is genuinely new.
  - Return the diff alongside the generation.
- Create a UI component that shows the diff (moved = blue, reframed = yellow,
  new = green).

**Acceptance criteria:**
- [ ] Diff correctly identifies moved claims (same claim_id, different position).
- [ ] Diff identifies reframed claims (same claim_id, different surrounding
      text).
- [ ] Genuinely new content (model_supplied or new claim) is highlighted.
- [ ] UI component is accessible (colors not the only indicator; uses icons
      and labels too).

**Dependencies:** Phase 3 (span attribution makes diff possible).

---

### Task X.3 — Staleness + Confidentiality Enforcement

**Traces to:** R11.1, R11.2

**Work:**
- Add freshnessWindow to ClaimArtifact (already in schema).
- Create a freshness checker: given a generation's claims, identify any with
  artifacts past their freshness window.
- Add confidentiality fields to claim display: flag claims from
  currentEmployer documents, highlight specific sensitive strings (dollar
  figures, row counts, internal system names).
- Integrate into deterministic checks (Task 3.6) and export gate (Task 5.9).

**Acceptance criteria:**
- [ ] A claim with an expired artifact is flagged in generation output.
- [ ] Export is blocked for expired claims without user override.
- [ ] Confidential claims show which specific strings are sensitive.
- [ ] User can set disclosure level per package (standard/redacted/full).

**Dependencies:** Phase 1 (ClaimArtifact exists), Phase 3 (deterministic checks
exist).

---

## Task Dependency Graph (Summary)

```
Phase 1 ─────────────────────────────────────────────
  1.1 (Schema) → 1.2 (API) → 1.3 (Corrections)
                           → 1.4 (Seed data)
                  1.2 + 1.3 → 1.5 (UI)

Phase 2 ─────────────────────────── (requires Phase 1)
  2.1 (Schema) → 2.2 (LLM) → 2.3 (Mapping) → 2.4 (API) → 2.5 (UI)

Phase 3 ─────────────────────────── (requires Phases 1+2)
  3.1 (Schema) ─┬→ 3.3 (Preflight) → 3.4 (Context) → 3.5 (Generate)
  3.2 (Prompts)─┘                                     ↓
                                              3.6 (Deterministic) → 3.7 (Critique) → 3.8 (Revise)
                                                                                      ↓
                                                                              3.9 (Orchestrator)

Phase 4 ─────────────────────────── (requires Phase 3)
  4.1 (Schema) → 4.2 (Upload) → 4.3 (Chunking) → 4.4 (Retrieval)
                                                 → 4.5 (Migration)
                  4.2 + 4.3 → 4.6 (UI)

Phase 5 ─────────────────────────── (requires Phases 1+3)
  5.1 (Schema) → 5.2 (Packages) → 5.9 (Export)
               → 5.3 (Variants)
  5.4 (Eval Schema) → 5.5 (Tier 1+Provenance) → 5.7 (Golden+Anchors) → 5.8 (Dashboard)
                     → 5.6 (Tier 2 Properties) ─┘

Cross-cutting:
  X.1 (Gap Naming) — after Phase 2
  X.2 (Diff View) — after Phase 3
  X.3 (Staleness) — after Phase 1 + Phase 3
```

---

## Estimated Effort

| Phase | Tasks | Estimated Sessions | Notes |
|-------|-------|--------------------|-------|
| 1     | 5     | 2-3                | Schema + CRUD is fast; UI is the long pole |
| 2     | 5     | 2-3                | LLM prompt tuning takes iteration |
| 3     | 9     | 4-6                | Core pipeline; most complex phase |
| 4     | 6     | 3-4                | Chunking + retrieval needs testing |
| 5     | 9     | 4-6                | Eval harness is methodical but repetitive |
| X     | 3     | 2-3                | Can interleave with main phases |

**Total: ~17-25 sessions.** Each session ships something. No session is wasted
on infrastructure that doesn't produce user-visible value by its end.

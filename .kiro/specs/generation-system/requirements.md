# Generation System — Requirements

Canonical requirements for the career-toolkit generation pipeline upgrade.
Derived from three source documents (generation requirements, evaluation harness
requirements, API delivery addendum) produced 31 Jul – 3 Aug 2026, plus one
addendum from the system owner.

Every requirement traces to an observed success or failure in two real
application packages (Anthropic, Sage). Requirements that the current build
already satisfies are marked; everything else is net-new or a gap in an existing
partial implementation.

---

## Foundational Principle: Claims vs. Evidence

> A claim's source phrasing is evidence of the claim, not its limit. The ledger
> holds the claim and its supporting artifacts separately, so a document that
> describes something narrowly doesn't silently constrain what you're allowed to
> say about it.

This principle governs the entire data model. A claim is an assertion about the
candidate. An artifact is a document passage, metric, or external citation that
supports the claim. A claim may be expressed in many ways across many documents;
the artifacts record where the evidence lives, but the claim text is the
canonical assertion and is not bounded by any single artifact's phrasing.

---

## R1 — Claims Ledger

**Source:** task-claims-ledger, API addendum §4

### R1.1 Claim Model

- Every factual assertion available to generation exists as a claim row.
- Fields: statement (canonical text), claim_key (dedup identifier), status
  (verified | unverified | superseded), superseded_by (nullable FK),
  last_verified_date, created_at.
- A claim is NOT the wording from a single source. It is the thing being
  asserted. Multiple artifacts may support the same claim with different
  phrasings.

### R1.2 Artifact Model (Evidence)

- Each claim has one or more supporting artifacts.
- Fields: claim_id (FK), source_document_id, passage_text (verbatim from
  source), passage_location (page/section/offset), authorship (user-authored |
  third-party | system-generated), ingestion_date, freshness_window (nullable
  duration).
- An artifact constrains nothing about how the claim may be expressed. It is
  evidence, not a template.

### R1.3 Negative Assertions

- A correction writes two rows: the corrected claim (status: verified) and a
  negative assertion naming the wrong value explicitly.
- Negative assertions are checked on every generation. Output containing a
  negative-assertion string is blocked.

### R1.4 Conflict Surfacing

- Conflicting claims on the same claim_key are surfaced to the user, never
  silently resolved by the system.
- Observed conflicts from source session: 25 vs 30 years experience, 9 vs 11
  hires, 10x vs 7.5x productivity, Berkeley 2025 vs 2026, three phrasings of
  the 30-million figure, iCarbonX with and without Israel.

### R1.5 Generation Constraint

- Generation cannot emit a numeric, date, or attribution claim that has no
  ledger row.
- A model-supplied span (one with no claim_id backing) is marked distinctly in
  output and never enters the ledger by repetition. Appearing in three documents
  raises suspicion, not confidence.

### R1.6 Corrections Channel (API mode)

- Every generated span is correctable in the UI. A correction writes to the
  ledger, not to the draft alone.
- A fix that lives only in the exported document will regress on the next
  generation.
- Deferral is allowed (confirm, reject, or leave pending). Pending corrections
  never promote to verified.
- Same-session correction triggers regeneration of affected spans only, not the
  whole document.

---

## R2 — Retrieval Provenance

**Source:** task-retrieval-provenance, API addendum §1, §3

### R2.1 Retrieval Logging

- Every retrieval writes a log entry: document_id, timestamp, session_id,
  success or failure, token_count.
- A context block that silently truncated is the same failure as one that
  returned nothing.

### R2.2 Retrieval Gating

- Assert non-empty retrieval for every required context block BEFORE the
  generation call fires.
- A claim citing a document with no successful retrieval in the current session
  is BLOCKED, not flagged.
- Never let a generation call proceed with a partially assembled context.
- Empty voice-corpus retrieval for a topic aborts generation.

### R2.3 Structured Output with Span Attribution

- Require JSON output: an array of spans, each with text plus either claim_id
  or model_supplied: true.
- Render prose from the structured output. The alignment pass stays as a check
  on user-written text, but generation produces structured spans natively.
- Reject any response whose spans don't reconstruct to the rendered text.

### R2.4 Model-Supplied Span Rules

- Model-supplied spans render distinctly in the UI.
- A pre-export gate lists every model-supplied or unverified span and requires
  an explicit disposition on each.
- Model-supplied spans never enter the ledger by repetition.

---

## R3 — Voice Corpus Retrieval

**Source:** task-voice-corpus-retrieval

### R3.1 Passage-Level Storage

- Voice samples are stored as passages, not documents.
- Each passage is tagged with topic(s) and carries a stable passage_id.

### R3.2 Topic-Based Retrieval

- Generation retrieves candidate passages by topic BEFORE drafting, not as a
  polish pass.
- Retrieval is re-run per generation. A passage retrieved in an earlier session
  does not count as retrieved now.

### R3.3 Paraphrase Flagging

- Any generated sentence that paraphrases a retrieved passage is flagged so the
  reviewer can compare it against the original wording.
- The system prefers the user's phrasing over a smoother rewrite. Where both
  exist, the original is the default and the rewrite is the alternate.

---

## R4 — Artifact Ingestion and Authorship

**Source:** task-artifact-ingestion-authorship

### R4.1 Required Fields

- Authorship and document date are required fields at upload.
- Documents flagged not-authored-by-user are excluded from voice retrieval and
  from claims about the user's own work.

### R4.2 Coverage Reporting

- Any retrieval pass over a named document set reports coverage (read, skipped,
  failed) as part of its output, unprompted.

### R4.3 Document Categories

- Six categories: work artifacts, third-party evidence, archived job postings,
  prior applications with outcomes, critiques and rejected drafts, compensation
  records.
- Work artifacts are first-class, distinct from resumes.

---

## R5 — Posting Decomposition

**Source:** task-posting-decomposition

### R5.1 Extraction on Ingest

- On posting ingest, extract: named responsibilities, stated bars, the problem
  the role exists to solve, and the vocabulary of the posting itself.

### R5.2 Hiring Questions

- Produce 3–5 questions a reviewer must answer before making an offer.
- Map each question to candidate claims and report any question with no claim
  behind it.

### R5.3 Archival

- Posting text is archived at application time with a retrieval date.

---

## R6 — Retargeting: Reorder, Not Rewrite

**Source:** task-retargeting-reorder-not-rewrite

### R6.1 Claim-Based Starting Point

- Generating for a new posting starts from the existing claim set, not from a
  blank draft.

### R6.2 Question-Driven Ordering

- Ordering is driven by the decomposed questions (R5.2), not by chronology or
  by the previous document's order.

### R6.3 Reframing vs. Rewriting

- Reframing rewrites the frame around a claim while the claim text stays bound
  to its ledger row.
- Example: "Nine teams running redundant pipelines" → "shared capability built
  once, not nine times." The underlying fact doesn't change.

### R6.4 Diff View

- A diff view shows what moved, what was reframed, and what is genuinely new.
- New text is the only part needing full review.

---

## R7 — Document Type Policy

**Source:** task-document-type-policy

### R7.1 Per-Type Style Rules

- Each document type carries its own style policy.
- Cover letter and essay: contractions, concrete specifics, one idea stated
  once, no rule-of-three for cadence.
- Resume: not her voice — scannable, parallel, numbers early.

### R7.2 Type-Bound Evaluation

- Style checks are evaluated against the document's own policy, never a global
  one.

### R7.3 Export Constraints

- Word and character limits enforced before export, with a count shown.
- PDF output must have selectable, extractable text for ATS parsing.
- No markdown artifacts (asterisks, smart quotes) in plain-text form fields.

---

## R8 — Cross-Document Overlap Control

**Source:** task-cross-document-overlap

### R8.1 Package Concept

- A package is a set of documents evaluated together (e.g., resume + cover
  letter + essay for one application).

### R8.2 Claim Usage Tracking

- Claims used in one document are marked as used within that package.
- Reuse in a sibling document requires explicit override.

### R8.3 Intra-Document Repetition

- Flag any claim or idea asserted more than once within a single document.

---

## R9 — Critique Pass

**Source:** task-critique-pass, API addendum §6

### R9.1 Three-Call Pipeline

- Generate → Critique → Revise runs as three separate calls.
- The critique call receives the rubric and the document-type policy, not the
  generation prompt.

### R9.2 Deterministic Pre-Checks

- Anything decidable without a model runs without one: regression string
  assertions, word/character counts, contraction rate, markdown artifacts,
  dollar figures and internal system names (confidentiality screen), freshness
  expiry.
- Cheap checks gate expensive ones. A draft that fails a regression assertion
  never reaches the critique call.

### R9.3 Rubric Checks (LLM-Evaluated)

- Contractions absent (in letter/essay types)
- Rule-of-three used for cadence (not for genuine lists)
- Every paragraph landing on a short declarative or aphorism
- Em-dash asides carrying rhythm not meaning
- Abstract nouns replacing a concrete specific the user actually gave
- Vocabulary lifted from the posting
- A claim with no exhibit beside it
- Same idea stated three times in adjacent sentences

### R9.4 Comprehension Check

- Flag any phrase the user would have to stop and parse.
- "APIs never meant to be composed" survived eight versions before she asked
  what it meant.

---

## R10 — Gap Naming

**Source:** task-gap-naming

### R10.1 Gap Identification

- After decomposition, identify stated bars with no claim behind them.

### R10.2 Gap Passage Generation

- For each gap, produce a one-sentence acknowledgment and the strongest
  adjacent claim, as a suggested passage the user can accept or decline.
- Never fabricate coverage for an unmet bar.

---

## R11 — Staleness and Confidentiality

**Source:** task-staleness-and-confidentiality

### R11.1 Freshness

- External-world claims carry a source date and a freshness window.
- Revalidate before export; block on expiry.

### R11.2 Confidentiality

- Claims sourced from current-employer-internal documents are flagged at
  generation with the specific details that would need removing (dollar figures,
  row counts, threshold values, internal system names).
- User sets disclosure level per package; flag persists until dispositioned.

---

## R12 — Generate Options, Not Answers

**Source:** API addendum §7

### R12.1 Variant Generation

- Where a real tradeoff exists, return variants with the tradeoff stated.
- Let the user choose.
- Observed instances: keep or cut a story; name a gap or let a screener find
  it; single-role framing versus market comparison.

### R12.2 Variant Tracking

- Record which variant was chosen.
- That signal is training data for ordering and feeds the edit-distance metric.

---

## R13 — Model Pinning and Recording

**Source:** API addendum §5

### R13.1 Per-Generation Recording

- Record model ID, prompt template version, temperature, and retrieval snapshot
  ID with every generation.

### R13.2 Version Change Protocol

- A model version change is a regression event: rerun Tier 1 and the anchors
  before accepting it.

### R13.3 Variance Measurement

- 3–5 runs per golden case, on a schedule, via batch API.

---

## R14 — Evaluation Harness

**Source:** eval harness requirements document (all sections)

### R14.1 Tier 1: Regression Assertions

- One assertion per claim that has ever been wrong, plus one per claim carrying
  a number, date, or attribution.
- Each correction generates a positive and a negative assertion.
- Suite runs on every generation, not on demand.
- A failure names the claim_id and the correction date.
- Target: 25–40 rows. Every future correction adds one.

Seed assertions from source session:

| Assert | Assert not |
|---|---|
| `REDACTED_LINKEDIN_URL` | `REDACTED_ALT_NAME` |
| `30 million customer genomes` | `REDACTED_FORBIDDEN_PHRASE_1`, `REDACTED_FORBIDDEN_PHRASE_2`, `REDACTED_FORBIDDEN_PHRASE_3` |
| ten years watching personalized medicine fail | REDACTED_FORBIDDEN_PHRASE_4 |
| $2M commitment closed after departure | `securing`, `secured` attached to her as completed act |
| NASA 2021 named with its subject matter | bare "Invited speaker, NASA (2021)" |
| foundation model fine-tuning attributed to her team | attributed to her personally |
| PhD subject choice under the JGI period | under the postdoc entry |
| ML-Infrastructure vision document | cited as her authorship |

### R14.2 Tier 2: Property Checks

- Contraction rate above a floor for letters/essays; not applied to resumes.
- Rule-of-three detection: flag three-item parallel lists in prose.
- Landing detection: flag when a majority of paragraphs end on a short
  declarative or aphorism.
- Posting-vocabulary overlap: flag distinctive terms appearing in both the
  posting and the draft.
- Exhibit adjacency: every claim of capability has a specific instance within
  two sentences.
- Intra-document repetition: same idea asserted more than twice.
- Comprehension flag: phrases with low corpus support and high abstraction.

### R14.3 Tier 3: Golden Packages

- 5–8 packages, spread across role family and sector.
- Each package stores: posting text with retrieval date, claim set at generation
  time, first generation, submitted version, and the diff.
- Each golden case runs 3–5 times. A single pass measures nothing about
  variance.
- Re-approve when the user makes the same edit twice.

### R14.4 Known-Bad Anchors

- Suite includes outputs that must score LOW.
- Held anchors: the original generated-sounding cover letter; the external
  revision that stripped voice and lifted posting vocabulary; the 3,500-word
  document written for a 300-word field.
- If any anchor scores above passing, the harness is broken.

### R14.5 Provenance Integrity Tests

- Assert that a generation citing a document with no successful retrieval fails.
- Assert that a retrieval pass reports coverage.
- Assert that a model-supplied claim doesn't acquire verified status through
  reuse.
- Assert that an external-world claim past its freshness window blocks export.

### R14.6 Metrics

- **Primary:** edit distance from first generation to submitted version, per
  package.
- Regression pass rate (should be 100%).
- Property violations per thousand words, by document type.
- Anchor discrimination: gap between golden mean and known-bad mean.
- Variance across 3–5 runs per golden case.

### R14.7 Scoring Split

- Fact assertions and structure/voice assertions score separately.
- They never aggregate into a single number.
- Fact assertions update when the ledger updates (routine).
- Structure/voice assertions change only on explicit re-approval.
- A high voice score with a failing fact assertion is a fail.

---

## R15 — Gap Detection Pre-Flight (API Mode)

**Source:** API addendum §2

### R15.1 Pre-Generation Coverage Check

- Coverage must be resolved before generation, not during.
- The pre-flight step reports which claims the decomposed questions need and
  which are missing.

### R15.2 Failure Mode

- Missing evidence blocks generation OR produces an explicit gap list for the
  user to resolve.
- Never silently generates around a hole.

---

## What Does Not Change

(Carried from source documents — these hold as-is in the current build.)

- Voice corpus contents and passage-level retrieval mechanism (once built).
- Document-type policy per type.
- Cross-document overlap control logic (once built).
- Golden packages, known-bad anchors, and the scoring split.
- Edit distance from first generation to submitted version as the primary
  metric.
- Compensation records stored for user reference; generation never produces
  salary language.

---

## What the Current Build Already Has

For reference during implementation — existing capabilities that partially
satisfy requirements above:

| Requirement | Existing Asset | Gap |
|---|---|---|
| R1 (Claims) | `ProfileMetric` model (label, value, source) | No status, no supersession, no negative assertions, no claim_key |
| R3 (Voice) | `WritingSample` model + `getVoiceGuidance()` | Document-level not passage-level; 5 samples max; first-500-chars truncation; no topic tags |
| R5 (Decomposition) | `llmParseJob()` extracts title, keywords, categorized phrases | No hiring questions; no "problem the role solves"; no claim mapping |
| R7 (Doc Type Policy) | Separate system prompts for resume vs. cover letter | No programmatic enforcement; no export-time validation |
| R9 (Critique) | Single LLM call | No critique step; no rubric; no deterministic pre-checks |
| R10 (Gap) | Gap analysis endpoint (keyword matching) | Not question-based; no passage suggestion |
| R13 (Model Pinning) | Model specified in code | Not recorded per generation; no prompt versioning |
| R14.6 (Metrics) | Coverage score (keyword-level) | No edit distance; no property checks; no regression suite |
| R15 (Pre-flight) | `checkGenerationReady()` blocks on unresolved items | Doesn't check claim coverage or evidence completeness |

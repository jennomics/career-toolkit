# Career Toolkit

An AI-powered career management platform that tracks job applications through a full pipeline, generates targeted resumes with span attribution and provenance tracking, parses unstructured job descriptions into structured data, and normalizes skills through a hierarchical taxonomy with gap analysis and coverage scoring.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5, React 19 |
| Database | PostgreSQL (Neon) via Prisma 7 |
| AI/NLP | OpenAI GPT-4o / GPT-4o-mini |
| Styling | Tailwind CSS 4 |
| Testing | Vitest (340+ tests) |

## Deployment Model

**Private deployment** uses Vercel Deployment Protection (password gate or SSO) to restrict access at the infrastructure level. No application-level auth is needed for the owner's browser sessions.

**Public demo** runs with `DEMO_MODE=true` connected to a separate synthetic database (`DEMO_DATABASE_URL`). All mutations are blocked at the middleware layer, and LLM calls are mocked. The demo database is validated to be different from the private database at startup.

## LLM Protection

All LLM calls route through a centralized `guardedLLMCall` wrapper that enforces:

- **Concurrency semaphore** (max 3 concurrent calls)
- **Daily budget tracking** ($5/day default, persisted to PostgreSQL)
- **Request timeout** (30s abort signal)
- **Input validation** (15K character limit)
- **Rate limiting** at the middleware layer (stricter limits for LLM routes)

The system degrades gracefully when no API key is configured or when the budget is exhausted.

## Security

- GC command API requires `GC_AUTH_TOKEN` (fail-closed in production)
- Service routes require `SERVICE_TOKEN`
- Middleware rate-limits all API routes (stricter for LLM endpoints)
- Eval assertions externalized from source code (loaded from gitignored JSON)

## Features

- **Job Application Tracker** - Full pipeline with kanban board, drag-and-drop, interviews, contacts, follow-ups, analytics, and CSV export.
- **Candidate Profile** - Career narrative with positioning statements, signature stories, metrics, and writing style samples.
- **Claims Ledger** - Fact verification system ensuring generated content is backed by evidence with correction tracking.
- **Voice Corpus** - Source document ingestion with passage extraction for voice/style matching in generation.
- **Posting Decomposition** - LLM-powered analysis breaking postings into problem statements, bars, vocabulary, and hiring questions.
- **Generation Pipeline** - 7-stage RAG pipeline with span attribution, provenance tracking, preflight checks, and critique loops.
- **Eval Harness** - Quality evaluation with golden packages, property assertions, and scoring metrics.
- **Job Intelligence Pipeline** - Paste a raw job description; GPT extracts structured data. Regex fallback works without an API key.
- **Hierarchical Skill Taxonomy** - 150+ manual mappings normalize skill variants with LLM fallback for unknown skills.
- **Resume Builder** - Six-step wizard with gap analysis, highlight recommendations, and cover letter generation.
- **Generic Resume Mode** - Optimizes a single resume for coverage across all saved jobs.
- **Company Workspaces** - Per-company views with scoped jobs, skills, and application tracking.
- **Experience Management** - Work history with resume upload (PDF/DOCX extraction).
- **Interactive De-duplication** - Detects company name variants and duplicate postings.

## Getting Started

```bash
npm install
cp .env.example .env
# Edit .env with your POSTGRES_URL and optionally OPENAI_API_KEY

npx prisma migrate deploy
npm run dev
```

The app runs at `http://localhost:3000`.

## Testing

```bash
npm test          # Run all 340+ tests
npm run test:watch # Watch mode
```

## Project Structure

```
src/
  app/                    - Next.js App Router pages and API routes
  components/             - Shared React components
  components/tracker/     - Pipeline board and tracker UI components
  lib/                    - Core logic (db, taxonomy, LLM, guards, rate limiting)
  lib/generation/         - Multi-stage generation pipeline
  lib/eval/               - Evaluation harness and assertion engine
  lib/voice/              - Voice corpus retrieval and passage management
prisma/
  schema.prisma           - Database schema (43 models)
  migrations/             - SQL migration history
  seed-demo.ts            - Demo database seeder (fictional persona)
scripts/                  - Seed scripts and migrations
```

## Environment Variables

See `.env.example` for the full list with descriptions.

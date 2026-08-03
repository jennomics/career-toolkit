# Career Toolkit

An AI-powered career management platform that parses unstructured job descriptions into structured data, normalizes skills through a hierarchical taxonomy, and generates targeted resumes with gap analysis and coverage scoring.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5, React 19 |
| Database | PostgreSQL (Neon) via Prisma 7 |
| AI/NLP | OpenAI GPT-4o / GPT-4o-mini |
| Styling | Tailwind CSS 4 |
| Testing | Vitest (89 tests) |

## Deployment Model

**Private deployment** uses Vercel Deployment Protection (password gate or SSO) to restrict access at the infrastructure level. No application-level auth is needed for the owner's browser sessions.

**Public demo** runs with `DEMO_MODE=true` connected to a separate synthetic database (`DEMO_DATABASE_URL`). All mutations are blocked at the middleware layer, and LLM calls are mocked. The demo database is validated to be different from the private database at startup.

## LLM Protection

All LLM calls route through a centralized `guardedLLMCall` wrapper that enforces:

- **Concurrency semaphore** (max 3 concurrent calls)
- **Daily budget tracking** ($5/day default, best-effort in-memory)
- **Request timeout** (30s abort signal)
- **Input validation** (15K character limit)
- **Rate limiting** at the middleware layer (stricter limits for LLM routes)

The system degrades gracefully when no API key is configured or when the budget is exhausted.

## Features

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
npm test          # Run all 89 tests
npm run test:watch # Watch mode
```

## Project Structure

```
src/
  app/           - Next.js App Router pages and API routes
  components/    - Shared React components
  lib/           - Core logic (db, taxonomy, LLM, guards, rate limiting)
prisma/
  schema.prisma  - Database schema (17 models)
  migrations/    - SQL migration history
  seed-demo.ts   - Demo database seeder (fictional persona)
```

## Environment Variables

See `.env.example` for the full list with descriptions.

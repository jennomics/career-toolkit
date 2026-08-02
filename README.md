# Career Toolkit

A full-stack AI-powered career management platform exploring how LLMs can augment the job search workflow -- from parsing unstructured job descriptions into structured data, to generating targeted resumes with gap analysis and coverage scoring.

Built as an engineering exercise in applied NLP, data normalization, and thoughtful full-stack architecture.

## Why This Exists

Job descriptions are unstructured text. Resumes are unstructured text. The gap between "what a company needs" and "what I've done" is a classification problem that LLMs handle well. This project explores that intersection:

- Can GPT reliably extract structured skill/responsibility data from free-text job postings?
- Can a hierarchical taxonomy normalize 150+ skill variants into a coherent graph?
- Can coverage scoring quantify resume-to-job fit across multiple target roles?
- What does graceful degradation look like when the LLM is unavailable?

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript, React 19 |
| Database | PostgreSQL (Neon) via Prisma 7 |
| AI/NLP | OpenAI GPT-4o / GPT-4o-mini |
| Styling | Tailwind CSS 4 |
| Architecture | Server Components + API routes, local-first cloud bridge |

## Features

**Job Intelligence Pipeline** -- Paste a raw job description; GPT extracts title, company, skills, responsibilities, and qualifications into structured records. Regex fallback ensures the system works without an API key.

**Hierarchical Skill Taxonomy** -- Auto-normalizes skill variants (e.g., "React.js", "ReactJS", "React" all resolve to one canonical entry). 150+ manual mappings with LLM fallback for unknown skills. Categorizes into hard/soft skills with subcategories.

**Resume Builder** -- Six-step guided wizard with gap analysis, highlight recommendations, bullet improvement suggestions, and cover letter generation. Supports both job-targeted and generic resume modes.

**Generic Resume Mode** -- Optimizes a single resume for maximum coverage across all saved jobs. Coverage scoring shows percentage match per role.

**Company Workspaces** -- Dedicated per-company views with scoped jobs, aggregated skills, resume tools, intelligence notes, and application tracking.

**Experience Management** -- Work history with highlights, metrics, and keyword tagging. Resume upload with automated content extraction (PDF and DOCX).

**Interactive De-duplication** -- Detects company name variants and duplicate job postings, with an interactive merge workflow.

**Dream Company/Job Tracking** -- Flag priority targets with visual indicators for focused job search strategy.

## Architecture Highlights

- **Lazy-initialized Prisma client** -- Proxy pattern ensures the database client is only instantiated at query time, avoiding issues with Next.js static generation and serverless cold starts.
- **Graceful LLM degradation** -- Every AI-powered feature has a regex/heuristic fallback. The system is fully functional without an OpenAI API key (just less accurate).
- **Incremental skill normalization** -- Only processes new/unmatched records, avoiding redundant LLM calls on the existing corpus.
- **Server/Client component split** -- Dashboard and read-heavy pages use Server Components; interactive features (wizard, dedup tool) use Client Components with optimistic updates.
- **Local-first cloud bridge** -- A local development agent enables zero-downtime development with offline-first data patterns.
- **Health monitoring** -- Sentinel and integrity endpoints for system observability.

## Project Structure

```
src/
  app/
    page.tsx                  -- Dashboard (Server Component)
    jobs/page.tsx             -- Job library with search/filter
    experience/page.tsx       -- Work history management
    skills/page.tsx           -- Taxonomy browser
    resume/page.tsx           -- Resume tools overview
    resume/build/page.tsx     -- 6-step resume wizard
    companies/page.tsx        -- Companies index
    company/[slug]/page.tsx   -- Company workspace
    dedup/page.tsx            -- De-duplication tool
    phrases/page.tsx          -- Resume phrase library
    api/                      -- API routes
  components/                 -- Shared React components
  lib/
    db.ts                     -- Prisma client (lazy proxy pattern)
    skill-taxonomy.ts         -- Taxonomy engine + normalization
    llm-parse-job.ts          -- GPT-powered extraction
    parse-job.ts              -- Regex fallback parser
prisma/
  schema.prisma               -- Database schema (PostgreSQL)
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or a [Neon](https://neon.tech) project)
- OpenAI API key (optional -- system degrades gracefully without it)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and optionally OPENAI_API_KEY

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

> **Note:** Always use `npx prisma migrate dev` for local schema changes.
> Never use `prisma db push` -- it bypasses the migration history and can cause data loss in shared environments.

The app will be available at `http://localhost:3000`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | No | Enables GPT-powered extraction and recommendations |

## Design Decisions

- **No auth layer** -- This is a single-tenant tool, not a SaaS product. Adding auth would be straightforward but unnecessary for the use case.
- **Prisma over raw SQL** -- Type safety and migration tooling outweigh the minor performance overhead for this workload.
- **GPT-4o-mini for extraction, GPT-4o for generation** -- Extraction is a structured task where the smaller model performs well; resume writing benefits from the larger model's fluency.
- **150+ hardcoded skill mappings** -- LLM normalization is non-deterministic. A curated mapping table ensures consistency for common skills while the LLM handles the long tail.

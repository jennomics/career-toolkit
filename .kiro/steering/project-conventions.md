# Career Toolkit

A job search app that helps users save job descriptions, extract keywords and resume-ready phrases via LLM, track skill patterns, and build targeted resumes.

## Development Setup

```bash
# First time:
npm install
npx prisma generate
npm run dev

# Or just run groundcrew (handles everything):
groundcrew start .
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: Neon PostgreSQL via Prisma 7 + @prisma/adapter-pg
- **LLM**: OpenAI GPT-4o-mini (for job description parsing)
- **Runtime**: Node.js 22
- **Deployment**: Vercel (career-toolkit-gilt.vercel.app)
- **Local Agent**: Groundcrew (auto-pulls, manages dev server, runs commands)

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── jobs/     # CRUD for job descriptions
│   │   ├── jobs/[id] # Single job operations (get, update, delete)
│   │   ├── jobs/check-duplicate/ # Duplicate detection endpoint
│   │   ├── health/   # Health check endpoint
│   │   ├── parse-job/     # LLM-powered extraction (falls back to regex)
│   │   ├── parse-skills/  # Keyword extraction endpoint
│   │   └── phrases/       # Resume phrases API + backfill
│   ├── phrases/      # Resume phrases dashboard
│   ├── layout.tsx
│   └── page.tsx      # Main dashboard
├── components/
│   ├── AddJobForm.tsx      # Paste-first form with LLM extraction + duplicate detection
│   ├── JobCard.tsx         # Job display with expandable phrases + archive/restore
│   ├── KeywordsSummary.tsx # Clickable keywords → associated phrases
│   └── SearchFilter.tsx    # Search + company/source filters
├── generated/prisma/ # Auto-generated Prisma client (do not edit)
└── lib/
    ├── db.ts              # Prisma client singleton (pg adapter, lazy-init)
    ├── llm-parse-job.ts   # OpenAI GPT-4o-mini integration
    ├── parse-job.ts       # Regex fallback parser + correction learning
    ├── parse-responsibilities.ts  # Action-verb phrase extraction
    └── parse-skills.ts    # Keyword pattern matching
prisma/
├── schema.prisma     # Database schema (Job, JobSkill, JobResponsibility, Correction)
.kiro/
├── steering/         # This file + groundcrew-communication design
```

## Critical: Database

The app connects to Neon PostgreSQL via `@prisma/adapter-pg`.
- `.env` → `POSTGRES_URL` or `POSTGRES_PRISMA_URL` (connection string)
- `src/lib/db.ts` → lazy-init Prisma client (connects at first use, not build time)
- `prisma.config.ts` → checks `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL` in order

## Code Standards

- All API routes wrapped in try/catch with error messages in response body
- Correction/learning features wrapped in separate try/catch (never block primary flow)
- LLM operations always have a regex fallback
- Errors must be shown in the UI, not just logged
- Use `@/` import alias for `src/` paths
- Prisma client: `import { prisma } from "@/lib/db"`

## Key Patterns

- **Paste-first flow**: User pastes raw JD → LLM extracts title, company, location, keywords, and resume phrases → user reviews/edits → save
- **Duplicate detection**: After parsing, checks for existing jobs with same title+company or similar description content. Shows warning but doesn't block.
- **Archive vs. active**: Jobs with status "rejected" or "closed" are considered archived. View toggle (Active/All/Archived) separates pipeline from history.
- **Correction learning**: When user edits auto-extracted fields, differences are stored and consulted for future extractions
- **Keywords**: Technology skills, tools, methodologies, competencies extracted from JDs
- **Resume-ready phrases**: Action-verb-driven statements categorized as DO (responsibility), NEED (requirement), NICE (qualification), each associated with keywords
- **Keyword drill-down**: Clicking a keyword in the summary shows all associated phrases across jobs

## Environment Variables

```
POSTGRES_URL="postgresql://..."       # or POSTGRES_PRISMA_URL — Neon connection string
OPENAI_API_KEY=sk-...                  # Required for LLM extraction, falls back to regex without it
```

## Agent Fleet (planned)

- **Groundcrew** (local): auto-pulls, manages dev server, runs commands, pushes results
- **Preflight** (server): validates code before push (build, env, schema)
- **Doctor** (local): diagnoses and fixes env/runtime errors autonomously
- **Sentinel** (local): health-checks the app after restarts
- **UX Guardian** (server): reviews UI for accessibility
- **Demo Producer** (server): generates demo recordings at milestones
- **Scribe** (server): captures decisions and patterns for future sessions

## Known Gotchas

- Prisma 7: createMany doesn't work reliably with all adapters → use individual creates
- Prisma 7: PrismaClient requires adapter in constructor (uses pg adapter now)
- Prisma 7: datasource url goes in prisma.config.ts, not schema.prisma
- Next.js Turbopack: stray package-lock.json in parent dirs confuses root detection → .env not loaded
- After schema changes: must run `prisma generate` AND restart dev server (hot reload doesn't catch it)
- Vercel: do NOT use output: "standalone" — breaks API routes
- Vercel: do NOT put `prisma db push` in the build command — use the manual schema-push workflow

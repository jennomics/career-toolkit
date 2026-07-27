# Career Toolkit

A job search app that helps users save job descriptions, extract keywords and resume-ready phrases via LLM, track skill patterns, and build targeted resumes.

## Development Setup

```bash
# First time:
npm install
npx prisma generate
npx prisma db push
chmod 666 dev.db
npm run dev

# Or just run groundcrew (handles everything):
groundcrew start .
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via Prisma 7 + @prisma/adapter-libsql
- **LLM**: OpenAI GPT-4o-mini (for job description parsing)
- **Runtime**: Node.js 22
- **Local Agent**: Groundcrew (auto-pulls, manages dev server, runs commands)

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── jobs/     # CRUD for job descriptions
│   │   ├── jobs/[id] # Single job operations (get, update, delete)
│   │   ├── parse-job/     # LLM-powered extraction (falls back to regex)
│   │   └── parse-skills/  # Keyword extraction endpoint
│   ├── layout.tsx
│   └── page.tsx      # Main dashboard
├── components/
│   ├── AddJobForm.tsx      # Paste-first form with LLM extraction
│   ├── JobCard.tsx         # Job display with expandable phrases
│   └── KeywordsSummary.tsx # Clickable keywords → associated phrases
├── generated/prisma/ # Auto-generated Prisma client (do not edit)
└── lib/
    ├── db.ts              # Prisma client singleton (libsql adapter)
    ├── llm-parse-job.ts   # OpenAI GPT-4o-mini integration
    ├── parse-job.ts       # Regex fallback parser + correction learning
    ├── parse-responsibilities.ts  # Action-verb phrase extraction
    └── parse-skills.ts    # Keyword pattern matching
prisma/
├── schema.prisma     # Database schema (Job, JobSkill, JobResponsibility, Correction)
└── migrations/
.kiro/
├── steering/         # This file + project conventions
├── agent-commands.json  # Commands from Kiro for Groundcrew to execute
└── agent-results.json   # Results pushed back by Groundcrew
```

## Critical: Database Path

The database lives at `./dev.db` (project root). Both:
- `.env` → `DATABASE_URL="file:./dev.db"`
- `src/lib/db.ts` → `url: "file:dev.db"`

Must point to the same location. After `prisma db push`, always `chmod 666 dev.db`.

## Code Standards

- All API routes wrapped in try/catch with error messages in response body
- Correction/learning features wrapped in separate try/catch (never block primary flow)
- LLM operations always have a regex fallback
- Errors must be shown in the UI, not just logged
- Use `@/` import alias for `src/` paths
- Prisma client: `import { prisma } from "@/lib/db"`

## Key Patterns

- **Paste-first flow**: User pastes raw JD → LLM extracts title, company, location, keywords, and resume phrases → user reviews/edits → save
- **Correction learning**: When user edits auto-extracted fields, differences are stored and consulted for future extractions
- **Keywords**: Technology skills, tools, methodologies, competencies extracted from JDs
- **Resume-ready phrases**: Action-verb-driven statements categorized as DO (responsibility), NEED (requirement), NICE (qualification), each associated with keywords
- **Keyword drill-down**: Clicking a keyword in the summary shows all associated phrases across jobs

## Environment Variables

```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=sk-...  # Required for LLM extraction, falls back to regex without it
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

- Prisma 7: createMany doesn't work reliably with libsql → use individual creates
- Prisma 7: PrismaClient requires adapter in constructor (PrismaLibSql)
- Next.js Turbopack: stray package-lock.json in parent dirs confuses root detection → .env not loaded
- After schema changes: must run `prisma generate` AND restart dev server (hot reload doesn't catch it)
- SQLite on macOS: db files may be created read-only → chmod 666 after creation

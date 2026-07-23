# Career Toolkit

A job search management app that helps users save job descriptions, analyze skill patterns, and build targeted resumes.

## Development Setup

```bash
npm install
npx prisma migrate dev    # Set up/update database
npm run dev               # Start dev server
npm run build             # Production build
npm run lint              # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via Prisma ORM
- **Runtime**: Node.js 22

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # REST API endpoints
│   │   ├── jobs/     # CRUD for job descriptions
│   │   └── parse-skills/  # Skill extraction endpoint
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Main dashboard
├── components/       # React UI components
├── generated/prisma/ # Auto-generated Prisma client (do not edit)
└── lib/              # Utilities and services
    ├── db.ts         # Prisma client singleton
    └── parse-skills.ts  # Skill extraction logic
prisma/
├── schema.prisma     # Database schema
└── migrations/       # Migration history
```

## Code Standards

- Use functional components with hooks
- Keep components in `src/components/`, one per file
- API routes go in `src/app/api/[resource]/route.ts`
- Use `@/` import alias for `src/` paths
- Prisma client is accessed via `import { prisma } from "@/lib/db"`

## Database

- SQLite for local development (file: `prisma/dev.db`)
- Run `npx prisma migrate dev --name <name>` after schema changes
- Run `npx prisma generate` if client types are stale

## Key Patterns

- Jobs are the core entity: title, company, full description, auto-extracted skills
- Skills are parsed via regex pattern matching (see `src/lib/parse-skills.ts`)
- SkillsSummary component shows skill frequency to guide resume writing
- Status tracking: saved -> applied -> interviewing -> offer/rejected/closed

## Future Plans

- Resume builder that uses skill frequency data
- Company tracker with career page links
- Network map for contacts at target companies
- AI-powered skill extraction (replace regex with LLM)

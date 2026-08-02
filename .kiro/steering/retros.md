# Session Retros — Accumulated Insights

This file captures patterns and process improvements discovered across sessions.
Individual session retros live in `.kiro/retros/YYYY-MM-DD.md`.

---

## Session Startup Checklist

Before building anything, verify local state via groundcrew:

```bash
# Send via POST /_gc/commands
cd /Users/REDACTED_ALT_NAME/kiro/career-toolkit && git branch && git log --oneline -3 && ls .env && echo "---" && grep -c model prisma/schema.prisma
```

This confirms: correct branch, latest code, .env present, schema intact.

## Branch Rules

- **main** is the only active branch for career-toolkit
- **feat/job-library** is dead — diverged, incompatible schema, never use again
- New features: branch from main, PR back to main
- Fixes: push directly to main

## .env is Fragile

- Not in git (correctly), but gets lost on branch switches and resets
- All prisma/db operations fail without it
- Groundcrew should verify .env exists before running prisma commands
- If missing, recreate: `echo 'POSTGRES_URL=...' > .env`
- The Neon connection string is the single point of failure for all DB operations

## Groundcrew Usage Patterns

- v0.4.0 is a smart proxy on port 4747 with lazy dev servers
- Git polling + post-pull tasks run automatically (npm install, prisma generate, restart)
- `prisma migrate deploy` runs automatically via CI when migrations change -- never use `db push` in production
- Seed scripts are NOT automatic — send as explicit command
- Always use groundcrew commands instead of asking the user to run terminal commands
- Auth: Bearer token on all mutating routes

## Resume Generation Architecture

- `src/lib/profile-context.ts` is the shared utility for all profile injection
- Profile injection is additive — no profile = no change to existing behavior
- `checkGenerationReady()` blocks generation if unresolved items exist
- Signature stories are selected by relevance (word matching, top 3)
- Voice guidance = writingStyle + first 500 chars of first writing sample
- Resume operating rules go into the system prompt, not user prompt

## Retro Process

- Run a retro at the end of every session
- Store in `.kiro/retros/YYYY-MM-DD.md`
- Update this file with new accumulated insights
- Save key patterns as learnings via the learning tool
- Delete outdated/conflicting learnings when patterns change

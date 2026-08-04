# Backlog

Items to revisit after testing.

---

## Revisit: generation-readiness gate strictness

**Added:** 2026-08-04
**Context:** After testing the resume builder end-to-end

The generation-readiness gate (`checkGenerationReady()` in `src/lib/profile-context.ts`) blocks resume/cover letter generation when unresolved profile items exist. Currently there are 8 unresolved items from the initial profile seed.

### Questions to answer after testing

- Is the gate too strict? Should it warn but not block?
- Should some item types be non-blocking ("nice to resolve" vs "must resolve")?
- Should the gate only apply to certain document types (e.g., block cover letters but not resumes)?
- Should there be a "generate anyway" override button on the resume page?

### Current behavior

- Gate checks `unresolvedItems` where `resolvedAt IS NULL`
- Any count > 0 returns 400 with a message naming the count
- No bypass, no override, no severity levels
- The resume page now shows a link to `/profile` when this error fires

### Related code

- `src/lib/profile-context.ts` → `checkGenerationReady()`
- `src/app/api/resume/generate/route.ts` → calls `checkGenerationReady()` early
- `src/app/api/resume/project/[id]/build/route.ts` → same check
- `prisma/schema.prisma` → `UnresolvedItem` model with `priority` field (could be used for severity)

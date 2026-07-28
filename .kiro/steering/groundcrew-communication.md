# Groundcrew Communication Pattern

## Problem Statement

Phase 2 used git commits to `.kiro/agent-commands.json` as a communication channel between Kiro (cloud) and Groundcrew (local). This caused:
- Race conditions (both writing to the same branch simultaneously)
- Branch pollution (merge commits, divergent histories)
- Neon branch limits (each branch attempt created a preview DB)
- Slow feedback loop (30s poll interval + git overhead)

## New Design: API-First Communication

### Architecture

```
┌─────────┐       HTTPS        ┌──────────┐      localhost:4747      ┌────────────┐
│  Kiro   │ ──── push code ──→ │  GitHub  │ ←── poll (git fetch) ── │ Groundcrew │
│ (cloud) │                     │          │                          │  (local)   │
│         │ ──── POST ────────→ │ /api/gc  │ ←── GET status ──────── │            │
└─────────┘       webhook       └──────────┘                          └────────────┘
```

### Option A: Vercel Webhook Relay (Recommended)

Kiro pushes code to GitHub → Vercel deploys → Groundcrew polls the deployed app's `/api/gc/commands` endpoint for pending tasks.

**Advantages:**
- No direct local access needed from cloud
- Works through NAT/firewalls
- Commands survive groundcrew restarts
- Results visible in production

**Endpoints (in career-toolkit app):**

```
POST /api/gc/commands     — Kiro creates a command (auth: bearer token)
GET  /api/gc/commands     — Groundcrew polls for pending commands
POST /api/gc/results      — Groundcrew reports command results
GET  /api/gc/status       — Dashboard: what's running, what finished
```

**Command lifecycle:**
1. `pending` → command created by Kiro
2. `running` → groundcrew picks it up
3. `success` / `failed` → groundcrew reports result

**Schema (stored in Neon, same DB):**
```prisma
model AgentCommand {
  id          String   @id @default(cuid())
  command     String   // shell command or action name
  description String?  // human-readable purpose
  status      String   @default("pending") // pending, running, success, failed
  stdout      String?  // command output
  stderr      String?  // error output
  exitCode    Int?
  duration    Int?     // ms
  source      String   @default("kiro") // who created it
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Option B: File-Based (Simpler, No Schema Change)

Keep the `.kiro/agent-commands.json` format but change the transport:
- Groundcrew watches `main` branch only (not feat/job-library)
- Commands are part of normal feature PRs — when merged, groundcrew picks them up
- Results written to a local-only file (not committed back)

**Disadvantage:** Still tied to git timing. Groundcrew can't act until code is merged.

### Recommendation

**Start with Option A** — it's cleaner, faster, and eliminates git as a communication channel entirely. The schema addition is tiny and the endpoints are simple CRUD.

### Migration Steps

1. Add `AgentCommand` model to schema.prisma
2. Create `/api/gc/*` endpoints (commands + results + status)
3. Add auth token check (simple bearer token, shared secret in env)
4. Update groundcrew to poll `/api/gc/commands` instead of watching `.kiro/agent-commands.json`
5. Remove `.kiro/agent-commands.json` and `.kiro/agent-results.json` from git tracking
6. Eventually: add a small status widget to the UI (shows active commands)

### Auth

- Groundcrew uses a shared secret: `GC_AUTH_TOKEN` env var
- Kiro includes it as a Bearer token when creating commands
- Simple, sufficient for a single-user app

### Polling vs. Webhook

Groundcrew already polls git every 5s. Polling `/api/gc/commands` every 5s is:
- Lighter weight than git fetch
- Returns structured JSON (not git diffs)
- Doesn't create branch history
- Can be made real-time later with SSE/WebSocket if needed

## Implementation Priority

This is a **design doc only** for Phase 3. Implementation is Phase 4 work:
1. Schema + endpoints
2. Groundcrew client update
3. Remove old git-based communication files
4. Optional: status widget in UI

## Key Rules Going Forward

- **Never commit to feat/job-library** — that branch is legacy
- **All feature code goes to new branches → PR → merge to main**
- **Groundcrew pulls from main** (the deployed branch)
- **Commands go through the API**, not through git commits

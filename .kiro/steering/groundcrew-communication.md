# Groundcrew Communication Pattern

## Overview

Groundcrew is a smart proxy + API server that runs locally on the developer's machine. It exposes a cloudflared tunnel for remote access, manages multiple projects with lazy dev servers, and provides a command execution interface -- all through a single HTTP API on port 4747.

## Architecture

```
┌─────────┐       HTTPS (tunnel)       ┌──────────────────────────┐       localhost       ┌─────────────────┐
│  Kiro   │ ──────────────────────────→ │   Groundcrew API Server  │ ──── proxy ─────────→ │  Dev Servers    │
│ (cloud) │                             │   (localhost:4747)        │                       │  (lazy start)   │
└─────────┘                             └──────────────────────────┘                       └─────────────────┘
                                                    │
                                                    ├── /_gc/commands   (execute shell commands)
                                                    ├── /_gc/status     (health + metadata)
                                                    ├── /_gc/projects   (manage projects)
                                                    └── /_gc/proxy/:project/*  (route to dev servers)
```

### Communication Flow

```
Kiro (cloud) --> HTTPS tunnel URL (*.trycloudflare.com) --> groundcrew API (localhost:4747) --> project dev servers
```

The cloudflared tunnel points to the groundcrew API port (4747), not to individual dev servers. All routing is explicit through the `/_gc/proxy/:project/*` endpoint.

## Endpoints

### `GET /` - Status Page

Content-negotiated root endpoint:
- **Browsers** (Accept: text/html): Returns a dark-themed HTML status page
- **Agents** (Accept: application/json): Returns JSON status identical to `/_gc/status`

### `GET /_gc/status` - JSON Status

Returns server health and metadata.

**Response:**

```json
{
  "version": "0.1.0",
  "uptime": 3421,
  "tunnelUrl": "https://abc123.trycloudflare.com",
  "projects": [
    {
      "name": "career-toolkit",
      "path": "/home/user/career-toolkit",
      "status": "serving",
      "devPort": 3000
    }
  ],
  "commandCount": 12
}
```

### `GET /_gc/commands` - List Commands

Returns stored commands. Supports optional status filtering.

**Query params:**
- `?status=pending|running|success|failed` (optional filter)

**Response:**

```json
{
  "commands": [
    {
      "id": "cmd_abc123",
      "command": "npm run build",
      "description": "Rebuild the project after dependency update",
      "status": "success",
      "source": "kiro",
      "stdout": "Build completed in 2.3s",
      "stderr": "",
      "exitCode": 0,
      "duration": 2300,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:02.300Z"
    }
  ]
}
```

### `POST /_gc/commands` - Submit a Command

Submits a command for asynchronous execution.

**Request:**

```json
{
  "command": "npm run build",
  "description": "Rebuild after dependency changes",
  "source": "kiro"
}
```

**Response (202 Accepted):**

```json
{
  "id": "cmd_abc123",
  "command": "npm run build",
  "description": "Rebuild after dependency changes",
  "status": "pending",
  "source": "kiro",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

**Example curl:**

```bash
curl -X POST https://abc123.trycloudflare.com/_gc/commands \
  -H "Content-Type: application/json" \
  -d '{"command": "npm run build", "description": "Rebuild project", "source": "kiro"}'
```

### `GET /_gc/projects` - List Projects

Returns all managed projects with their current status.

**Response:**

```json
{
  "projects": [
    {
      "name": "career-toolkit",
      "path": "/home/user/career-toolkit",
      "devCommand": "npm run dev",
      "devPort": 3000,
      "status": "idle"
    }
  ]
}
```

### `POST /_gc/projects` - Add a Project

Registers a new project for management.

**Request:**

```json
{
  "path": "/home/user/career-toolkit",
  "name": "career-toolkit",
  "devCommand": "npm run dev",
  "devPort": 3000
}
```

Only `path` is required. `name` defaults to the directory basename. `devCommand` and `devPort` are auto-detected if not provided.

**Response (201 Created):**

```json
{
  "name": "career-toolkit",
  "path": "/home/user/career-toolkit",
  "devCommand": "npm run dev",
  "devPort": 3000,
  "status": "idle"
}
```

**Example curl:**

```bash
curl -X POST https://abc123.trycloudflare.com/_gc/projects \
  -H "Content-Type: application/json" \
  -d '{"path": "/home/user/career-toolkit"}'
```

### `DELETE /_gc/projects/:name` - Remove a Project

Removes a project from management. Stops its dev server if running.

**Response (200 OK):**

```json
{
  "removed": "career-toolkit"
}
```

**Example curl:**

```bash
curl -X DELETE https://abc123.trycloudflare.com/_gc/projects/career-toolkit
```

### `ALL /_gc/proxy/:project/*` - Proxy to Dev Server

Routes any HTTP method to the named project's dev server. If the dev server is not running, it starts lazily (first request triggers startup, waits for health check, then proxies).

**Example curl:**

```bash
# Proxy a GET request to the career-toolkit dev server
curl https://abc123.trycloudflare.com/_gc/proxy/career-toolkit/api/jobs

# Proxy a POST request
curl -X POST https://abc123.trycloudflare.com/_gc/proxy/career-toolkit/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"title": "Software Engineer"}'
```

## Command Lifecycle

1. **Submit**: `POST /_gc/commands` with `{command, description, source}`
2. **Pending**: Command is queued, returns immediately with status `pending`
3. **Running**: Groundcrew picks up the command and begins execution
4. **Complete**: Status updates to `success` or `failed` with stdout, stderr, exitCode, and duration
5. **Poll**: `GET /_gc/commands?status=running` to check progress, or `GET /_gc/commands` for all

Commands are stored locally in `~/.groundcrew/commands.json` with:
- Rolling maximum of 50 commands
- 24-hour maximum age
- Auto-purge on each write (oldest/expired removed first)

## Request Tracing

Every request to groundcrew receives an `X-Correlation-ID` header in the response. This ID is auto-generated per request and appears in logs for end-to-end tracing.

## Dev Server Lifecycle

Dev servers are managed lazily:
- **Start on demand**: First proxy request to `/_gc/proxy/:project/*` triggers startup
- **Health check**: Groundcrew waits for the dev server port to respond before proxying
- **Idle timeout**: Servers stop after 30 minutes of inactivity (configurable)
- **Always watched**: Git polling continues regardless of dev server state

## Configuration

Stored at `~/.groundcrew/config.json`:

```json
{
  "apiPort": 4747,
  "projects": [
    {
      "name": "career-toolkit",
      "path": "/home/user/career-toolkit",
      "devCommand": "npm run dev",
      "devPort": 3000
    }
  ]
}
```

## CLI Usage

```bash
# Start groundcrew (reads config, starts API server + tunnel)
groundcrew start

# Add a project
groundcrew add /path/to/project

# Remove a project
groundcrew remove career-toolkit

# Override API port
groundcrew start --api-port 8080
```

## Key Design Decisions

- **No Vercel relay** -- communication goes directly through the cloudflared tunnel
- **No git-based command passing** -- commands are HTTP POST/GET, not committed files
- **No database schema** -- commands stored in local JSON, not Prisma/Neon
- **No branch pollution** -- tunnel URL is not committed to git
- **Single tunnel** -- one tunnel to port 4747 serves all projects through explicit proxy routing
- **Lazy dev servers** -- start on first proxy request, stop after idle timeout
- **Multiple projects** -- one groundcrew instance manages all local projects

## Integration with Kiro

When Kiro needs to interact with the local development environment:

1. User provides the tunnel URL at session start (it changes on every groundcrew restart)
2. Use the tunnel URL to reach groundcrew endpoints
3. Submit commands via `POST /_gc/commands` with bearer token for shell operations
4. Access dev server previews via `/_gc/proxy/:project/*` (also requires bearer token)
5. Check project status via `GET /_gc/projects` (open, no auth)
6. Poll command results via `GET /_gc/commands` (open, no auth)

### Authentication

- **Read-only routes** (GET status, GET commands, GET projects): open, no auth required
- **Mutating routes** (POST commands, POST/DELETE projects, proxy): require `Authorization: Bearer <GC_AUTH_TOKEN>` header
- Token is set via `GC_AUTH_TOKEN` environment variable in the user's `~/.zshrc`
- If token is not set, groundcrew rejects all mutating requests with 503

### Session startup pattern

```
1. User pastes tunnel URL (e.g., https://xyz.trycloudflare.com)
2. Kiro hits /_gc/status to confirm reachability
3. Kiro sends commands with Authorization: Bearer <token>
4. Kiro polls /_gc/commands to read results
```

### Git Polling + Post-Pull Tasks

Groundcrew automatically:
- Polls git every 5 seconds for each registered project
- On new commits: stash → pull → run post-pull tasks → restart dev server if running

Post-pull tasks (automatic):
- `npm install` if package.json changed
- `npx prisma generate` if prisma/schema.prisma changed
- Dev server restart if source code changed AND server is currently running

NOT automatic (must be sent as explicit commands):
- `npx prisma db push` (risk of data loss — always explicit)
- Seed scripts (`npm run seed:claims`, `npm run seed:eval`, etc.)
- Any destructive operation

### Dev Server Restart

The dev server does NOT hot-reload:
- Prisma schema changes (new models, new fields)
- Component file structure changes (new files, moved files)

After pushing code with these changes, send this command:
```
pkill -f "next dev"; sleep 2 && rm -rf .next && npx prisma generate && npx next dev > /tmp/ct-dev.log 2>&1 &
```

Or wait for the dev server to idle-timeout and let groundcrew's lazy-start recompile on the next browser request.

All communication is stateless HTTP. No persistent connections, no WebSockets, no polling loops required (though polling `/_gc/commands` for results is the expected pattern).

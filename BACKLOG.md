# Career Toolkit — Feature Backlog

## Infrastructure & DevOps

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| I-1 | **PostgreSQL migration** | Switch from SQLite to Postgres everywhere (local + Vercel). Write data migration script for existing 116 jobs. | Medium |
| I-2 | **Vercel deployment** | Deploy to Vercel with managed Postgres. Public URL for sharing. | Low |
| I-3 | **Groundcrew: Doctor agent** | Separate process that diagnoses and auto-fixes errors when groundcrew reports failures | Medium |
| I-4 | **Groundcrew: Sentinel** | Health-checks the app after every restart (hits APIs, confirms they work) | Medium |
| I-5 | **Groundcrew: monitoring widget** | Terminal or web UI showing which agents are active and what they're doing | Medium |
| I-6 | **Preflight agent** | Validates code before push (build, missing env vars, schema mismatches) | Medium |
| I-7 | **CI/CD pipeline** | GitHub Actions: lint, build, deploy to Vercel on merge to main | Low |

## Resume Builder

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| R-1 | **Resume phrases dashboard** | Dedicated page showing all extracted phrases grouped by keyword, sorted by frequency | Low |
| R-2 | **Resume draft generator** | Given your target role, auto-generate a tailored resume using your top keywords + best phrases | High |
| R-3 | **Phrase editor** | Edit/rewrite extracted phrases to personalize them (your voice, your accomplishments) | Medium |
| R-4 | **Export to PDF** | Generate a formatted resume PDF from selected phrases | Medium |
| R-5 | **Multiple resume profiles** | Save different versions (e.g., "Data Leader" vs "AI Strategy" vs "VP Engineering") | Medium |
| R-6 | **Gap analysis** | Compare your resume against a specific job description — what's missing? | Medium |

## Job Management

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| J-1 | **Bulk import** | Paste multiple JDs at once (separated by dividers), batch-process via LLM | Medium |
| J-2 | **Search & filter** | Full-text search across descriptions, filter by keyword/company/status | Low |
| J-3 | **Company tracker** | Group jobs by company, link to careers pages, track which companies you're targeting | Medium |
| J-4 | **Timeline view** | When did you apply, when did you hear back, what's the pipeline look like | Medium |
| J-5 | **Job similarity scoring** | "Jobs like this one" — find clusters in your saved jobs | Medium |
| J-6 | **Archive vs. active** | Separate closed/old jobs from active pipeline without deleting | Low |
| J-7 | **Duplicate detection** | Warn when pasting a JD that's already saved | Low |

## Networking

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| N-1 | **Contact tracker** | Add people (name, company, role, relationship, last contacted) | Medium |
| N-2 | **Company-contact mapping** | See who you know at each target company | Low (after N-1) |
| N-3 | **Outreach templates** | Generate personalized outreach messages based on the job + your background | Medium |
| N-4 | **Follow-up reminders** | "You haven't reached out to X in 2 weeks" | Medium |
| N-5 | **LinkedIn data import** | Parse your LinkedIn connections export to seed the contact database | Medium |

## Intelligence & Insights

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| A-1 | **Skill trend analysis** | How are your target roles evolving? What keywords are appearing more/less over time? | Medium |
| A-2 | **Salary intelligence** | Extract compensation info from JDs when mentioned, track ranges | Low |
| A-3 | **Company research** | Auto-fetch company info (size, funding, industry) when you add a job | Medium |
| A-4 | **Interview prep** | Given a JD, generate likely interview questions + suggested talking points from your phrases | High |
| A-5 | **Correction learning v2** | Use LLM to learn extraction patterns from your corrections (not just exact match) | Medium |

## UX & Accessibility

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| U-1 | **Accessibility audit** | ARIA labels, keyboard nav, screen reader support, color contrast | Medium |
| U-2 | **Mobile responsive** | App works well on phone (paste JDs on the go) | Medium |
| U-3 | **Dark mode** | Proper dark theme | Low |
| U-4 | **Onboarding flow** | First-time user experience — explain what to do, show example | Low |
| U-5 | **Keyboard shortcuts** | Quick actions (N for new job, / for search, etc.) | Low |

## Agent Fleet

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| F-1 | **Preflight agent** | Pre-push validation (build, env, schema) | Medium |
| F-2 | **Doctor agent** | Error diagnosis and auto-fix | High |
| F-3 | **Sentinel agent** | Post-deploy health checks | Medium |
| F-4 | **UX Guardian agent** | Accessibility review on every UI change | Medium |
| F-5 | **Demo Producer agent** | Browser automation to screen recording at milestones | High |
| F-6 | **Scribe agent** | Formalized session-end knowledge capture | Low |

---

## Suggested Phase 2

1. I-1 + I-2: PostgreSQL + Vercel (public URL, eliminates SQLite issues)
2. R-1: Resume phrases dashboard (immediate value from 116 saved jobs)
3. J-2: Search & filter (find things in 116 jobs)
4. J-6 + J-7: Archive + duplicate detection (housekeeping)
5. F-1: Preflight agent (prevents iteration waste)

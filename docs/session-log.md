# Session Log

## Purpose
Tracks meaningful engineering progress, architectural changes, debugging insights, and implementation milestones.

Update this file after major development sessions.

---

## 2026-05-27

### Completed

- Read the assignment requirements, root README, backend/frontend README files, and Claude guidance.
- Reviewed the backend schema, auth middleware, route handlers, seed data, and main frontend dashboard/queue/login screens.
- Identified the main audit hotspots across security, concurrency, performance, database design, and frontend stability.
- Updated `missing-thing.md` and `todo.md` with the discovered issues and execution order.
- Added a clean Markdown problems table in `docs/table.md` with total count, file locations, and easy/medium/hard ratings.

### Decisions

- Keep the log readable with markdown headings instead of a raw prose dump.
- Treat the backend, Prisma schema, and frontend as the primary risk areas for follow-up fixes.
- Track issues first before making code changes so the backlog stays aligned with the audit.
- Use a compact table format for the issue summary so the backlog is easier to scan.

### Problems Encountered

- None blocking during the review pass.

### Next Steps

- Fix the highest-risk security issues first.
- Then address queue concurrency, performance bottlenecks, and the missing patient history route.

---

## 2026-05-27 — Comprehensive Audit Pass

### Completed

- Read every source file in the entire codebase (backend: 7 files, frontend: 7 files, prisma schema, seed, config files, docker-compose, setup script, CSS).
- Cross-referenced documented issues (13 in missing-thing.md) against actual code.
- Discovered 22+ additional undocumented issues across security, backend, frontend, database, and documentation categories.
- Populated readme.md with full setup instructions, architecture overview, and API reference.
- Updated assignment.md with project context (later replaced by user with the actual Figital Labs assignment document).
- Updated missing-thing.md with all 22 new issues in the standard format.
- Updated todo.md with additional tasks covering the newly discovered issues.

### Key Findings

- **Critical undocumented:** Missing `Link` import crashes the doctor workflow. Registration endpoint leaks password hashes in response.
- **High undocumented:** Hardcoded JWT secret fallback in source code and .env.example. Login endpoint leaks stack traces. CORS allows all origins. DOM anti-patterns and missing AbortController on frontend.
- **Medium undocumented:** 7+ inconsistent API response shapes. No rate limiting. No status validation on appointment/queue PATCH. No CASCADE delete handling. No auto-logout on 401. Missing AbortController. SQL error messages leaked.
- **Docs issues:** assignment.md had completely wrong project content. approach.md, readme.md, major-error.md were all empty.

### Decisions

- Issues documented first before any code modifications.
- All findings use the standard missing-thing.md format for consistency.
- New findings organized into original missing-thing format (Title/Severity/Category/Location/Problem/Root Cause/Recommended Fix/Estimated Time/Priority/Status).

### Next Steps

- Review the updated findings backlog and prioritize fixes.
- Begin with Critical security fixes (Link import, password hash leak, JWT issues).
- Address doc gaps (approach.md, major-error.md) as fixes are implemented.

---

## 2026-05-27 — Initial Setup & Documentation

### Completed

- Ran project setup: `chmod +x setup.sh && ./setup.sh` (installed root, backend, and frontend dependencies)
- Created `.env` from `.env.example`
- Ran database migrations and seed via `npm run db:setup --prefix backend`
- Started dev servers via `npm run dev` (backend on :5000, frontend on :3000)
- Verified application is running and functional

### Documentation Created This Session

- `assignment.md` — Correct Figital Labs assignment requirements
- `readme.md` — Setup guide, project structure, API reference
- `missing-thing.md` — 35 documented issues across all categories
- `todo.md` — 8 execution phases ordered by priority
- `session-log.md` — Engineering log (this file)
- `approach.md` — Placeholder (to be filled during fixes)
- `major-error.md` — Placeholder (to be filled if errors occur)

### Decisions

- Documentation was prioritized before any code fixes to establish a clear audit trail
- Issues documented in standard format for consistency
- Phases ordered by: Security → Frontend stability → Data integrity → Performance → API standards → Validation → Cleanup

### Next Steps

- Begin implementing fixes starting with Phase 1 (Critical security issues)
- Record approach in approach.md as each fix is implemented

---

## 2026-05-27 — Phase 1: index.js Security Fixes

### Completed

- **Fixed CORS misconfiguration** — Restricted from wildcard (`*`) to configurable origin via `process.env.CORS_ORIGIN` (defaults to localhost:3000). Whitelisted specific HTTP methods.
- **Fixed global error handler** — Removed `err.message` and `err.stack` from API error responses. Errors are logged server-side and a generic message is returned to the client.
- **Fixed unhandled rejection handler** — Added `process.exit(1)` after logging so the process manager can restart the server cleanly instead of running in an unstable state.
- **Removed duplicate cors require** — Cleaned up duplicate `const cors = require("cors")` on line 20 that would cause a SyntaxError on startup.

### Files Changed

- `backend/src/index.js` — All three fixes + duplicate removal

### Next Steps

- Continue with Phase 1 security fixes (auth routes, SQL injection, admin auth bypass)
- Document approach in approach.md

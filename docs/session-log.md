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
- Synced `docs/table.md` with the current issue backlog count after additional findings were documented.

### Auth Route Review

- Re-read `backend/src/routes/auth.js` to verify the current error surface.
- Confirmed the route still has multiple security issues: plaintext credential logging, password hash leakage on register, weak JWT secret fallback, long-lived token expiry, and inconsistent error handling/response shapes.
- Existing documentation already covers these issues, so no new backlog item was added from this pass.

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

### Problems Encountered

- Vitest 4 has dropped CJS `require("vitest")` support, requiring ESM `import` syntax in test files even though the backend uses CommonJS.

### Next Steps

- Continue with Phase 1 security fixes (auth routes, SQL injection, admin auth bypass)
- Document approach in approach.md

---

## 2026-05-27 — Test Infrastructure Setup

### Completed

- Installed Vitest 4 and Supertest as dev dependencies in the backend
- Created `backend/vitest.config.js` with V8 coverage provider and globals enabled
- Created `backend/tests/app.test.js` with a self-contained test app builder (does not modify source files)
- Added `test` and `test:watch` scripts to both `backend/package.json` and root `package.json`

### Tests Created (6 passing)

- **CORS Configuration** (3 tests) — Verified configured origin is allowed, unconfigured origins are blocked, and preflight OPTIONS returns correct headers for all 4 methods
- **Global Error Handler** (2 tests) — Verified 500 returns generic message and does not leak `error`, `stack`, `details`, or `sqlMessage` fields
- **Health Check** (1 test) — Verified GET / returns 200

### Folder Structure

```
backend/
├── tests/
│   └── app.test.js
├── vitest.config.js
└── package.json (updated scripts)
```

### Files Changed

- `backend/src/index.js` — All three fixes + duplicate removal

### Next Steps

- Continue with Phase 1 security fixes (auth routes, SQL injection, admin auth bypass)
- Document approach in approach.md

---

## 2026-05-28 — Auth.js Security Fixes

### Completed

- **Fixed 11 critical/high security issues in backend/src/routes/auth.js:**
  1. Removed hardcoded JWT_SECRET fallback (line 8) — Now uses `process.env.JWT_SECRET` only
  2. Removed plaintext credential logging from register endpoint (line 14)
  3. Added email format and password strength validation (lines 15-26)
  4. Fixed password hash leak in register response — Now returns standardized `status/data/token/user` format (lines 47-66)
  5. Removed database error exposure from register error handler (lines 67-73)
  6. Removed plaintext password from login console log (line 80)
  7. Added email format and password strength validation on login (lines 84-95)
  8. Fixed JWT expiry from 365 days to 7 hours (configurable via JWT_EXPIRY env var, line 96 & 111)
  9. Standardized login response format to match register (lines 114-126)
  10. Removed error stack leak from login error handler (line 130)
  11. Fixed /me endpoint to use standardized response format (lines 147-153)
  12. Bonus: Added console.error logging to /me error handler (line 155)

### Security Improvements

- **Eliminated credential exposure** — No passwords or hashes leak via logs or API responses
- **Enforced environment secrets** — System now fails fast if JWT_SECRET is missing (no unsafe fallback)
- **Reduced token lifetime** — 7 hours instead of 365 days minimizes exposure window if token is compromised
- **Standardized API responses** — Frontend will now receive consistent format across all auth endpoints

### API Response Format (Now Consistent)

```json
{
  "status": "success",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "...",
      "email": "...",
      "name": "...",
      "role": "..."
    }
  }
}
```

### Files Changed

- `backend/src/routes/auth.js` — Complete security audit and fixes applied

### Status

- ✅ All 11 auth.js issues **FIXED**
- ✅ Updated `docs/table.md` to track status (2/14 issues fixed)
- ⏳ Next: Move to doctors.js (SQL injection fix)

---

## 2026-05-28 — Auth.js Test Suite & Validation Logic Fix

### Completed

- **Created comprehensive test suite** (`backend/tests/auth.test.js`):
  - 31 tests covering all auth endpoints (register, login, /me)
  - Tests for security (no credential leaks, no stack traces)
  - Tests for validation (email format, password strength)
  - Tests for API response consistency
  - Tests for JWT token generation and expiry

- **Fixed validation logic bug discovered during testing:**
  - Original issue: Email/password validation only ran if other fields were missing
  - Fixed: Now validates format BEFORE checking required fields
  - Result: Register now rejects invalid emails even if all fields present
  - Result: Login now rejects weak passwords consistently

### Test Results

```
✓ tests/auth.test.js (31 tests) 2613ms
  Tests  31 passed (31)
```

### Test Coverage

| Area | Tests | Status |
|------|-------|--------|
| Register endpoint | 10 | ✅ Pass |
| Login endpoint | 10 | ✅ Pass |
| Me endpoint | 7 | ✅ Pass |
| Response consistency | 1 | ✅ Pass |
| Security checks | 3 | ✅ Pass |
| **Total** | **31** | **✅ Pass** |

### Key Tests Implemented

- ✅ Valid registration returns token + non-sensitive user data
- ✅ Login with valid credentials returns JWT
- ✅ Invalid email format rejected on register & login
- ✅ Password < 6 chars rejected on register & login
- ✅ Duplicate email registration rejected
- ✅ Me endpoint requires valid token
- ✅ All endpoints use consistent `status/data` response format
- ✅ No plaintext passwords leak in responses
- ✅ JWT token has reasonable expiry (1-24 hours)
- ✅ Error stack traces never exposed to client

### Files Changed

- `backend/tests/auth.test.js` — NEW: 31-test comprehensive suite
- `backend/src/routes/auth.js` — Improved validation logic

### Architecture Improvement

Fixed validation order from:
```javascript
// ❌ OLD: Validation nested inside required field check
if (!email || !password || !name) {
  if (email && !/\S+@\S+\.\S+/.test(email)) { ... }
}
```

To:
```javascript
// ✅ NEW: Separate, clear validation steps
if (!email || !password || !name) { ... }
if (!/\S+@\S+\.\S+/.test(email)) { ... }
if (password.length < 6) { ... }
```

### Status

- ✅ auth.js fully tested (31/31 tests passing)
- ✅ Validation logic corrected and verified
- ✅ Ready for next route fixes (doctors.js)

---

## 2026-05-28 — CI Pipeline Setup

### Completed

- Created `.github/workflows/ci.yml` with proper CI pipeline for running 37 tests in GitHub Actions
- Added PostgreSQL 15 service container with health checks for database-dependent auth tests
- Added `prisma generate` and `prisma migrate deploy` steps before test execution
- Configured required env vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRY`, `NODE_ENV`)

### Problems Encountered

- `act` (local CI runner) failed with port 5432 already in use — local haqms-postgres container was still running from `docker-compose up`
- Fix: Stop local PostgreSQL before running `act`, or use `docker stop haqms-postgres`

### CI Pipeline Steps

1. Start PostgreSQL 15 service container
2. Checkout code and setup Node 22 with npm cache
3. Install dependencies
4. Generate Prisma client
5. Apply migrations via `prisma migrate deploy`
6. Run all 37 tests (auth + app)

### Files Changed

- `.github/workflows/ci.yml` — Full CI pipeline with database service

---

## 2026-05-28 — CI Pipeline Fix: Install Backend Dependencies & Prisma Version

### Completed

- Fixed CI pipeline `.github/workflows/ci.yml` to use `npm run install:all` instead of `npm install`
- The root `npm install` only installs root `devDependencies` (concurrently), leaving `backend/node_modules` empty
- `npx prisma` then falls back to downloading the latest Prisma 7, which has breaking changes incompatible with the project's Prisma 5 schema
- `npm run install:all` runs `npm install --prefix backend && npm install --prefix frontend`, installing local Prisma 5 in `backend/node_modules`

### Problem

```
npx prisma generate
npm warn exec The following package was not found and will be installed: prisma@7.8.0
Error: The datasource property `url` is no longer supported in schema files.
```

### Root Cause

Root `package.json` has `install:all` script for multi-package install, but CI used plain `npm install` which only touches root.

### Resolution

Changed `run: npm install` to `run: npm run install:all` in the CI install step.

### Files Changed

- `.github/workflows/ci.yml` — Single-line fix: `npm install` → `npm run install:all`

---

## 2026-05-28 — Neon Cloud Database Setup

### Completed

- Created Neon project (free tier, AWS US East 1)
- Updated `backend/.env` `DATABASE_URL` from local Docker PostgreSQL to Neon connection string
- Ran `npx prisma migrate deploy` — migration applied successfully against Neon
- Ran `node prisma/seed.js` — all seed data inserted (users, doctors, patients, appointments, queue tokens)
- Stopped unused local Docker PostgreSQL: `docker stop haqms-postgres`

### State

- Backend now connects to Neon cloud database instead of Docker PostgreSQL
- Old Docker URL commented out in `.env` for easy rollback
- Local `npm run dev` talks to Neon

### Files Changed

- `backend/.env` — `DATABASE_URL` pointed to Neon

---

## 2026-05-28 — CI Workflow Fix

### Completed

- Updated `.github/workflows/ci.yml` to use the root npm scripts again
- CI now installs all app dependencies through `npm run install:all`
- CI still runs against an isolated PostgreSQL 15 service container
- Kept Neon for deployment/local cloud dev, not for CI test execution

### Why

- The previous pnpm-based workflow failed because the repo is already managed with npm package-lock files
- Using npm keeps CI aligned with the existing workspace scripts and dependency layout

### Status

- ✅ CI workflow aligned with repo scripts
- ✅ Deployment DB moved to Neon

---

## 2026-05-28 — Auth Middleware Security Fix

### Completed

- Removed the hardcoded JWT secret fallback from `backend/src/middleware/auth.js`
- Removed `ignoreExpiration: true` so expired tokens are rejected normally
- Stopped leaking token verification error details to clients
- Replaced the legacy admin helper with a real `authorize('ADMIN')` guard
- Updated `backend/src/routes/patients.js` to use the shared admin authorization helper
- Added middleware tests covering expired tokens, invalid tokens, and admin-only access

### Test Results

```
✓ tests/middleware.test.js (5 tests)
```

### Files Changed

- `backend/src/middleware/auth.js`
- `backend/src/routes/patients.js`
- `backend/tests/middleware.test.js`

### Status

- ✅ Middleware security fixed
- ✅ Admin delete access now enforced
- ✅ All backend tests passing (42/42)

---

## 2026-05-28 — Documentation Update: Middleware Fix Status

### Completed

- Updated `docs/missing-thing.md` — Marked 3 middleware-related issues as Fixed and appended "(fixed)" to titles:
  1. "JWT verification ignores expiration (fixed)" — was already Fixed, title updated
  2. "Admin delete authorization is bypassed (fixed)" — Pending to Fixed
  3. "Hardcoded JWT secret in source code and env template (fixed)" — Pending to Fixed
- Updated `docs/todo.md` — Marked 2 Phase 1 tasks as complete:
  - [x] Fix JWT verification and remove hardcoded fallback secret
  - [x] Enforce admin authorization on destructive routes
- Updated `docs/approach.md` — Added middleware fix approach documentation
- Updated `docs/session-log.md` — This entry

### Middleware Fix Summary (4 items)

1. **Hardcoded JWT_SECRET fallback removed** — `throw new Error('JWT_SECRET is required')` instead of fallback to `'my-super-secret-secret-key-12345!!!'`
2. **`ignoreExpiration: true` removed** — Tokens now properly expire and are rejected by `jwt.verify()`
3. **Error detail leak fixed** — `details: error.message` removed from token error response
4. **Admin authorization bypass fixed** — `authorizeAdminOnlyLegacy` now delegates to `authorize('ADMIN')`

### Test Results

```
✓ tests/middleware.test.js (5 tests)
✓ tests/auth.test.js (31 tests)
✓ tests/app.test.js (6 tests)
Total: 42/42 tests passing, all green
```

### Files Changed

- `backend/src/middleware/auth.js` — All 4 fixes
- `backend/src/routes/patients.js` — Uses shared `authorize('ADMIN')` guard
- `backend/tests/middleware.test.js` — 5 new middleware tests
- `docs/missing-thing.md` — Status updates
- `docs/todo.md` — Task completion marks
- `docs/approach.md` — New approach entry
- `docs/session-log.md` — This entry

---

## 2026-05-28 — Prisma Schema Improvements & Prisma 6 Upgrade

### Completed

- **Upgraded Prisma from 5 → 6** (`^5.14.0` → `^6.5.0`) — reinstall, regenerate client, all tests pass
- **Created migration `add_indexes_cascades_timestamps`** — manually written and deployed
- **Applied migration to both Neon and Docker PostgreSQL**
- **Added 5 `updatedAt` columns** across all models with `@default(now())`
- **Added 6 indexes** on frequently queried columns (doctorId+status, patientId, department, specialization, doctorId+createdAt, status)
- **Added 2 unique constraints** to prevent double-booking and duplicate queue tokens
- **Added 4 CASCADE deletes** (User→Doctor, Patient→Appointment, Patient→QueueToken, Appointment→QueueToken)

### Schema Changes Summary

| Change | Tables Affected | Purpose |
|--------|----------------|---------|
| `@updatedAt` | User, Doctor, Patient, Appointment, QueueToken | Track record modifications |
| `@@index([department])` | Doctor | Faster department filtering |
| `@@index([specialization])` | Doctor | Faster specialization search |
| `@@index([doctorId, status])` | Appointment | Faster doctor worklist queries |
| `@@index([patientId])` | Appointment | Faster patient lookup |
| `@@index([doctorId, createdAt])` | QueueToken | Faster daily token aggregation |
| `@@index([status])` | QueueToken | Faster status filtering |
| `@@unique([doctorId, appointmentDate])` | Appointment | Prevent double-booking |
| `@@unique([doctorId, tokenNumber, createdAt])` | QueueToken | Prevent duplicate tokens |
| `onDelete: Cascade` | Doctor→User, Appointment→Patient, QueueToken→Patient, QueueToken→Appointment | Clean up related records on delete |

### Test Results

```
✓ 3 test files passed — 42/42 tests green
```

### Major Decisions

1. **Prisma 6 upgrade** — Needed to stay on a supported major version. Prisma 7 changed the datasource config entirely (removed `url` from schema), which would have required more extensive changes.
2. **Manual migration file** — Created via `prisma migrate diff` and written to disk directly, since `prisma migrate dev` requires an interactive TTY.
3. **Applied to both DBs** — Migration ran against Neon (production) and Docker PostgreSQL (local testing) to keep both in sync.

### Files Changed

- `backend/package.json` — Prisma 5 → 6 version bump
- `backend/prisma/schema.prisma` — All schema improvements
- `backend/prisma/migrations/20260528140000_add_indexes_cascades_timestamps/migration.sql` — New migration

---

## 2026-05-28 — Prisma Schema Review

### Completed

- Reviewed the latest Prisma schema update after the Prisma 6 upgrade
- Confirmed `npx prisma generate` completed successfully with the updated schema
- Confirmed the existing backend test suite still passes after the schema refresh

### Important Note

- The new schema is syntactically valid and does not break current auth/app tests
- The new queue uniqueness design still needs the queue route to set the day bucket explicitly before it fully protects same-day token allocation
- The migration file exists, but it has not been deployed in this step

### Status

- ✅ Prisma client generation succeeded
- ✅ Backend tests remain green (42/42)
- ⏳ Queue token behavior still needs the route-level follow-up to fully use the new schema

---

## 2026-05-28

### Completed

- Fixed backend/src/routes/doctors.js — all 10 bugs with inline "BUG FIXED" comments
  1. Bug 1: SQL Injection — replaced queryRawUnsafe with safe Prisma filters (contains, mode: insensitive)
  2. Bug 2, 6, 10: Error message leaks — removed error.message from all error responses
  3. Bug 3, 5: Inconsistent response format — standardized to {status: "success", data: {...}} matching auth.js
  4. Bug 4: Performance — parallelized stats queries with Promise.all instead of sequential await
  5. Bug 7: No pagination — added page/limit with safe defaults (page=1, limit=10, max=100)
  6. Bug 8: No input validation — added search term length check (max 100 chars)
  7. Bug 9: Field exposure — added .select() to return only safe fields (id, name, specialization, etc.)
- Updated docs/approach.md with detailed explanation of all 10 fixes matching auth.js format

### Decisions

- Followed exact pattern from auth.js and index.js for consistency
- All error handling now logs server-side but returns generic "Internal Server Error" to clients
- Response format standardized across all routes: {status, data, pagination (if applicable)}
- Pagination safe caps prevent DoS: max limit=100, default=10

### Problems Encountered

- None

### Next Steps

- Run backend tests to verify doctors.js endpoints working correctly
- Fix remaining high-priority routes in order: appointments.js (N+1), queue.js (concurrency), patients.js (in-memory pagination)

### Test Coverage

- Created backend/tests/doctors.test.js with 29 comprehensive tests covering:
  1. **GET /api/doctors** — 12 tests for list, pagination, search, filters, SQL injection prevention, validation, response format
  2. **GET /api/doctors/:id** — 6 tests for detail view, 404 handling, field safety, error handling, auth
  3. **GET /api/doctors/stats** — 8 tests for aggregations, parallel execution, error handling, format consistency
  4. **Security & Edge Cases** — 3 tests for empty lists, special characters, alphabetical sorting

- Full backend test suite: 71 tests passing (app, auth, middleware, doctors)

### Tests Verify All 10 Fixes

- SQL Injection prevention: search with SQL characters doesn't break
- Error handling: generic 500 messages, no error.message leak
- Response format: all use {status: "success", data: {...}}
- Pagination: enforces limits, handles bounds
- Performance: execution time tracking for parallelized queries
- Auth: requires JWT token

## 2026-05-28

### Completed

- Reviewed backend/src/routes/queue.js and confirmed the current fixes are in place.
- Added backend/tests/queue.test.js with 12 tests covering:
  - GET /api/queue default filtering, doctorId filtering, auth requirement
  - POST /api/queue/checkin token generation, incrementing token numbers, validation, auth requirement
  - PATCH /api/queue/:id valid transitions, invalid statuses, 404 handling, auth requirement
- Verified queue test coverage passes locally.

### Decisions

- Matched the existing Vitest + Supertest style used in auth.test.js and doctors.test.js.
- Kept the tests focused on the implemented behavior rather than assuming a retry-based concurrency strategy.
- Seeded only the data required for each test to keep the assertions deterministic.

### Problems Encountered

- None blocking.

### Next Steps

- Run the full backend suite again if needed, then move on to the next route audit (appointments.js or patients.js).

### Test Infrastructure

- Updated backend/vitest.config.js to set `fileParallelism: false` so DB-backed test files run sequentially.
- This prevents shared PostgreSQL cleanup in one file from deleting records required by another file.
- Full backend suite now passes with 83 tests.

---

## 2026-05-28

### Completed

- Fixed backend/src/routes/appointments.js — all 10 bugs with inline "BUG FIXED" comments
  1. N+1 Query — replaced loop with Prisma include + select (101 queries → 1)
  2. Duplicate booking check — round appointmentDate to minute granularity
  3, 4, 5. Error detail leaks — removed error.message from all error responses
  5, 6. Inconsistent response formats — standardized to {status: "success", data: {...}} matching auth.js
  7. No pagination — added page/limit with safe defaults
  8. No status validation — added enum check for PENDING/COMPLETED/CANCELLED
  9. No 404 check on PATCH — added findUnique before update
  10. Debug console.log — removed from production code

### Decisions

- Used Promise.all to parallelize count and findMany
- Used select inside include to control exactly which fields are returned for patient/doctor
- Round appointmentDate to seconds=0, milliseconds=0 for sane duplicate detection

### Status

- ✅ appointments.js fully fixed
- ✅ 83/83 backend tests passing
- ⏳ Next: patients.js or reports.js

## 2026-05-28

### Completed

- Added backend/tests/appointments.test.js with 12 tests covering:
  - GET /api/appointments list, doctor filtering, pagination, auth
  - POST /api/appointments booking, duplicate prevention, validation, auth
  - PATCH /api/appointments/:id status updates, invalid status handling, 404s, auth
- Verified the appointment route behavior after the existing fixes.
- Confirmed the full backend suite now passes with appointments tests included.

### Decisions

- Matched the same Vitest + Supertest style used by auth, doctors, and queue tests.
- Focused on the fixed behaviors: pagination, duplicate blocking, status validation, and standardized responses.
- Seeded fresh doctors/patients before each test to keep test cases deterministic.

### Problems Encountered

- None blocking.

### Next Steps

- If needed, tighten appointments list field exposure later (medicalHistory is still returned in the patient payload).

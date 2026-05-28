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

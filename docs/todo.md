## Phase 1 — Security Fixes

- [x] Fix JWT verification and remove hardcoded fallback secret
- [x] Remove credential logging and sanitize auth responses
- [x] Remove password hash from registration response
- [x] Remove stack trace leakage from login error response
- [x] Replace raw SQL search with parameterized Prisma queries
- [x] Enforce admin authorization on destructive routes
- [x] Restrict CORS to specific origins
- [x] Add rate limiting to auth endpoints
- [x] Add helmet security headers
- [x] Remove sqlMessage from doctor search error responses

## Phase 2 — Frontend Crash Fixes

- [x] Add missing `Link` import in Dashboard component
- [x] Fix null user crash on logout (optional chaining + null guard)
- [x] Guard nullable medical history rendering
- [x] Guard doctor check-in against undefined matchedDoc
- [x] Fix queue polling interval cleanup
- [x] Fix stale closure on refreshCount

## Phase 3 — Data Integrity and Concurrency

- [x] Make queue token generation atomic
- [x] Add schema constraints for appointment and queue uniqueness
- [x] Add indexes for common filters and joins
- [x] Add CASCADE delete handling on relations
- [x] Add @updatedAt timestamps to models
- [x] Validate appointment status transitions (PATCH)
- [x] Validate queue status transitions (PATCH)

## Phase 4 — Backend Performance

- [x] Eliminate N+1 queries in appointments
- [x] Parallelize doctor stats queries
- [x] Rewrite nested report aggregation efficiently
- [x] Move patient pagination and filtering into the database

## Phase 5 — API Standardization

- [x] Define consistent API response envelope and apply to all endpoints
- [x] Update frontend to handle standardized responses

## Phase 5.5 — Backend Regression Fixes

- [x] Fix doctor worklist broken by missing userId in /api/doctors select clause

## Phase 6 — Frontend Stability

- [x] Replace hardcoded API URL with env var in AuthContext
- [x] Remove duplicated API URL in queue page
- [x] Add auto-logout on 401 responses (fetchWithAuth wrapper)
- [x] Fix ESLint React 19 warnings (state initializers, comment placement)
- [x] Create .env file with NEXT_PUBLIC_API_URL
- [x] Guard doctor check-in against undefined matchedDoc
- [x] Implement the missing patient history route
- [x] Add AbortController to fetch calls in dashboard
- [x] Convert DOM getElementById refs to React state
- [x] Add loading/disabled state to submit buttons
- [x] Improve dashboard search and fetch behavior

## Phase 7 — Input Validation

- [x] Add backend validation for phone number format
- [x] Add backend validation for age range bounds
- [x] Add backend validation for email format
- [x] Add frontend validation parity

## Phase 8 — Cleanup and Documentation

- [x] Remove unused icon imports in Dashboard
- [ ] Fix availableFrom/availableTo to use proper time type
- [ ] Update README docs with confirmed setup notes
- [ ] Record implementation approaches for each fix
- [ ] Re-run app flows after each major change

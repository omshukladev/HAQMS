## Phase 1 — Security Fixes

- [x] Fix JWT verification and remove hardcoded fallback secret
- [x] Remove credential logging and sanitize auth responses
- [x] Remove password hash from registration response
- [x] Remove stack trace leakage from login error response
- [x] Replace raw SQL search with parameterized Prisma queries
- [x] Enforce admin authorization on destructive routes
- [x] Restrict CORS to specific origins
- [ ] Add rate limiting to auth endpoints
- [ ] Add helmet security headers
- [x] Remove sqlMessage from doctor search error responses

## Phase 2 — Frontend Crash Fixes

- [ ] Add missing `Link` import in Dashboard component
- [ ] Guard nullable medical history rendering
- [ ] Guard doctor check-in against undefined matchedDoc
- [ ] Fix queue polling interval cleanup
- [ ] Fix stale closure on refreshCount

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
- [ ] Rewrite nested report aggregation efficiently
- [x] Move patient pagination and filtering into the database

## Phase 5 — API Standardization

- [x] Define consistent API response envelope and apply to all endpoints
- [ ] Update frontend to handle standardized responses

## Phase 6 — Frontend Stability

- [ ] Add AbortController to fetch calls in dashboard
- [ ] Convert DOM getElementById refs to React state
- [ ] Add auto-logout on 401 responses
- [ ] Add loading/disabled state to submit buttons
- [ ] Improve dashboard search and fetch behavior
- [ ] Implement the missing patient history route

## Phase 7 — Input Validation

- [x] Add backend validation for phone number format
- [x] Add backend validation for age range bounds
- [x] Add backend validation for email format
- [ ] Add frontend validation parity

## Phase 8 — Cleanup and Documentation

- [ ] Remove unused icon imports in Dashboard
- [ ] Fix availableFrom/availableTo to use proper time type
- [ ] Update README docs with confirmed setup notes
- [ ] Record implementation approaches for each fix
- [ ] Re-run app flows after each major change

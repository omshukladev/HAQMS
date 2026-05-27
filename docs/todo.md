## Phase 1 — Security Fixes

- [ ] Fix JWT verification and remove hardcoded fallback secret
- [ ] Remove credential logging and sanitize auth responses
- [ ] Remove password hash from registration response
- [ ] Remove stack trace leakage from login error response
- [ ] Replace raw SQL search with parameterized Prisma queries
- [ ] Enforce admin authorization on destructive routes
- [ ] Restrict CORS to specific origins
- [ ] Add rate limiting to auth endpoints
- [ ] Add helmet security headers
- [ ] Remove sqlMessage from doctor search error responses

## Phase 2 — Frontend Crash Fixes

- [ ] Add missing `Link` import in Dashboard component
- [ ] Guard nullable medical history rendering
- [ ] Guard doctor check-in against undefined matchedDoc
- [ ] Fix queue polling interval cleanup
- [ ] Fix stale closure on refreshCount

## Phase 3 — Data Integrity and Concurrency

- [ ] Make queue token generation atomic
- [ ] Add schema constraints for appointment and queue uniqueness
- [ ] Add indexes for common filters and joins
- [ ] Add CASCADE delete handling on relations
- [ ] Add @updatedAt timestamps to models
- [ ] Validate appointment status transitions (PATCH)
- [ ] Validate queue status transitions (PATCH)

## Phase 4 — Backend Performance

- [ ] Eliminate N+1 queries in appointments
- [ ] Parallelize doctor stats queries
- [ ] Rewrite nested report aggregation efficiently
- [ ] Move patient pagination and filtering into the database

## Phase 5 — API Standardization

- [ ] Define consistent API response envelope and apply to all endpoints
- [ ] Update frontend to handle standardized responses

## Phase 6 — Frontend Stability

- [ ] Add AbortController to fetch calls in dashboard
- [ ] Convert DOM getElementById refs to React state
- [ ] Add auto-logout on 401 responses
- [ ] Add loading/disabled state to submit buttons
- [ ] Improve dashboard search and fetch behavior
- [ ] Implement the missing patient history route

## Phase 7 — Input Validation

- [ ] Add backend validation for phone number format
- [ ] Add backend validation for age range bounds
- [ ] Add backend validation for email format
- [ ] Add frontend validation parity

## Phase 8 — Cleanup and Documentation

- [ ] Remove unused icon imports in Dashboard
- [ ] Fix availableFrom/availableTo to use proper time type
- [ ] Update README docs with confirmed setup notes
- [ ] Record implementation approaches for each fix
- [ ] Re-run app flows after each major change

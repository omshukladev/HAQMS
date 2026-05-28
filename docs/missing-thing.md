### Title
JWT verification ignores expiration (fixed)

### Severity
Critical

### Category
Security

### Location
backend/src/middleware/auth.js

### Problem
Expired tokens are still accepted because verification disables expiration checks. Combined with the fallback hardcoded secret, this allows long-lived forged or reused tokens.

### Root Cause
Authentication is implemented with insecure defaults instead of enforcing a required secret and normal token expiry validation.

### Recommended Fix
Require JWT_SECRET from env, remove ignoreExpiration, and return a generic 401 on invalid tokens.

### Estimated Time
30-45 minutes

### Priority
Fix first because it affects every authenticated route.

### Status
Fixed

### Title
Sensitive credentials are logged and leaked

### Severity
Critical

### Category
Security

### Location
backend/src/routes/auth.js

### Problem
Login and registration handlers log raw request bodies and return sensitive fields too broadly. This can expose passwords, password hashes, and user details in logs or API responses.

### Root Cause
Debug logging and response shaping were left in place instead of redacting secrets and selecting safe response fields.

### Recommended Fix
Remove plaintext credential logging, return only safe user fields, and keep server errors generic.

### Estimated Time
30 minutes

### Priority
High priority because it leaks secrets immediately under normal usage.

### Status
Fixed

### Title
Doctor search is vulnerable to SQL injection

### Severity
Critical

### Category
Security

### Location
backend/src/routes/doctors.js

### Problem
The search endpoint builds SQL with string interpolation and executes it with queryRawUnsafe. A crafted query can dump arbitrary rows or bypass query intent.

### Root Cause
Raw SQL was used without parameterization or escaping.

### Recommended Fix
Switch to Prisma filters or parameterized raw queries only if raw SQL is unavoidable.

### Estimated Time
45-60 minutes

### Priority
Critical because it can expose user and medical data.

### Status
Fixed

### Fix Summary
- Replaced unsafe $queryRawUnsafe usage with Prisma query filters (findMany + where).
- Added pagination (page, limit) and caps to avoid heavy responses.
- Sanitized and standardized API responses; errors now return generic messages and are logged server-side.
- Optimized stats endpoint to run independent queries in parallel with Promise.all.

### Estimated Verification
- Unit tests for doctors endpoints should cover search, pagination, and stats. Manual API checks: search term containing SQL meta-characters should not break or return unintended rows.

### Title
Admin delete authorization is bypassed (fixed)

### Severity
Critical

### Category
Security

### Location
backend/src/middleware/auth.js, backend/src/routes/patients.js

### Problem
The admin-only middleware does not enforce the ADMIN role, so authenticated non-admin users can delete patient records.

### Root Cause
Authorization was stubbed out and the route still depends on the broken helper.

### Recommended Fix
Enforce role checks in middleware and use the shared authorize('ADMIN') guard on privileged routes.

### Estimated Time
30-45 minutes

### Priority
Critical because it breaks access control on destructive actions.

### Status
Fixed

### Title
Queue token generation can duplicate numbers

### Severity
High

### Category
Concurrency

### Location
backend/src/routes/queue.js, backend/prisma/schema.prisma

### Problem
Token generation reads the current max, waits, then inserts. Concurrent check-ins can create duplicate token numbers for the same doctor and day.

### Root Cause
The workflow is not atomic and the schema lacks a uniqueness constraint to enforce correctness at the database layer.

### Recommended Fix
Use a transaction-safe allocation strategy and add a unique constraint/index for doctor/day/token numbering.

### Estimated Time
1-2 hours

### Priority
High because queue order integrity matters in live operations.

### Status
Pending

### Title
Appointments route performs N+1 queries

### Severity
Medium

### Category
Performance

### Location
backend/src/routes/appointments.js

### Problem
The appointments list fetches related patient and doctor rows one-by-one in a loop, multiplying database calls as the dataset grows.

### Root Cause
Relationship loading was implemented manually instead of using includes or batched queries.

### Recommended Fix
Use Prisma include/select to fetch related rows in one query and trim the payload.

### Estimated Time
30-45 minutes

### Priority
Medium because it becomes costly under larger schedules.

### Status
Pending

### Title
Doctor stats and reports are sequential and slow

### Severity
Medium

### Category
Performance

### Location
backend/src/routes/doctors.js, backend/src/routes/reports.js

### Problem
Independent counts and nested per-doctor aggregations run sequentially, causing avoidable latency and poor scaling.

### Root Cause
Async work was not parallelized and repeated counts were computed inside per-record loops.

### Recommended Fix
Use Promise.all for independent queries and reduce nested per-doctor database calls with grouped aggregates.

### Estimated Time
1-2 hours

### Priority
Medium because it affects the admin dashboard experience.

### Status
Pending

### Title
Patient list paginates in memory

### Severity
Medium

### Category
Database

### Location
backend/src/routes/patients.js

### Problem
The patients endpoint loads all rows, filters in memory, then slices for pagination. This will not scale and wastes memory and query time.

### Root Cause
Pagination, search, and filtering were implemented on the application side instead of in SQL.

### Recommended Fix
Push search/filter/page logic into the Prisma query and add supporting indexes.

### Estimated Time
1-2 hours

### Priority
Medium because the directory grows with usage and this will become a bottleneck.

### Status
Pending

### Title
Doctor and appointment schema lacks key constraints and indexes

### Severity
Medium

### Category
Database

### Location
backend/prisma/schema.prisma

### Problem
The schema does not enforce unique appointment slots and is missing useful indexes on common filters and joins.

### Root Cause
Data integrity rules were left to application logic, and query patterns were not mapped to indexes.

### Recommended Fix
Add uniqueness and index constraints for appointment and queue patterns, then migrate safely.

### Estimated Time
1-2 hours

### Priority
Medium because it improves both correctness and performance.

### Status
Pending

### Title
Queue page leaks polling intervals

### Severity
High

### Category
Frontend

### Location
frontend/src/app/queue/page.js

### Problem
The polling interval is never cleared on unmount, so repeated navigation stacks timers and keeps updating dead components.

### Root Cause
The effect setup omitted cleanup for the interval.

### Recommended Fix
Return a cleanup function that clears the interval and guard state updates on unmounted components.

### Estimated Time
20-30 minutes

### Priority
High because it causes memory growth and stale background work.

### Status
Pending

### Title
Doctor dashboard crashes on null medical history

### Severity
High

### Category
Frontend

### Location
frontend/src/app/dashboard/page.js

### Problem
The medical history modal calls toUpperCase on a nullable field, which crashes rendering for patients with empty history.

### Root Cause
The UI assumes every patient record has medicalHistory populated.

### Recommended Fix
Render a safe fallback string when the field is null or empty.

### Estimated Time
15-20 minutes

### Priority
High because it breaks the doctor flow on seeded data.

### Status
Pending

### Title
Missing patient history detail route

### Severity
Medium

### Category
Frontend

### Location
frontend/src/app/patients/[id]/history-records/page.js

### Problem
The dashboard links to a route that does not exist, so the legacy patient history action lands on the 404 page.

### Root Cause
The navigation surface was implemented before the destination page existed.

### Recommended Fix
Create the dynamic route, fetch the patient record, and render the clinical history summary.

### Estimated Time
1-2 hours

### Priority
Medium because it is an incomplete feature, not a blocker.

### Status
Pending

### Title
Link component used without import in Dashboard

### Severity
Critical

### Category
Frontend

### Location
frontend/src/app/dashboard/page.js

### Problem
The `<Link>` component from `next/link` is used at line 903 to navigate to the patient history records page, but `Link` is never imported in the file. When a doctor clicks the "View Diagnostic Reports" link inside the medical history modal, the component throws a ReferenceError and crashes the page.

### Root Cause
The import for `next/link` was omitted when the feature was added. Only `lucide-react` icons and React hooks were imported.

### Recommended Fix
Add `import Link from 'next/link'` at the top of the file alongside the other imports.

### Estimated Time
5 minutes

### Priority
Critical because it crashes the doctor workflow on a navigate action, with no error boundary to catch it.

### Status
Pending

### Title
Registration endpoint returns password hash in response

### Severity
Critical

### Category
Security

### Location
backend/src/routes/auth.js

### Problem
The POST /api/auth/register handler at line 42-44 returns the full Prisma `user` object in the response, which includes the `password` field (bcrypt hash). Any frontend client or API consumer receives the password hash, making offline brute-force attacks possible.

### Root Cause
The response was not pruned to exclude sensitive fields. The Prisma `create` returns the full record by default and the code forwards it directly without a `select` projection.

### Recommended Fix
Use Prisma `select` to return only safe fields (id, email, name, role) or explicitly delete the password field from the response object.

### Estimated Time
15 minutes

### Priority
Critical because password hashes are leaked on every registration call.

### Status
Pending

### Title
Hardcoded JWT secret in source code and env template (fixed)

### Severity
High

### Category
Security

### Location
backend/src/middleware/auth.js, backend/src/routes/auth.js, backend/.env.example

### Problem
The JWT secret has a hardcoded fallback value `'my-super-secret-secret-key-12345!!!'` in two source files (auth.js middleware at line 3, auth.js routes at line 8). Additionally, `.env.example` contains the same secret. Anyone with access to the repo (or who guesses the common fallback) can forge valid JWTs for any user role.

### Root Cause
A development convenience fallback was left in production-oriented code, and the env template commits the secret to version control.

### Recommended Fix
Remove the hardcoded fallback and crash at startup if JWT_SECRET is not set in the environment. Remove actual secret values from .env.example (use a placeholder like `change-me`).

### Estimated Time
15 minutes

### Priority
High because combined with the ignoreExpiration bug, it eliminates all JWT security.

### Status
Fixed

### Title
Login endpoint leaks error stack traces to client

### Severity
High

### Category
Security

### Location
backend/src/routes/auth.js

### Problem
The login route at line 98 returns `errorStack: error.stack` in 500 responses. This exposes internal server paths, file structure, dependency versions, and potentially database schema details to API consumers and attackers.

### Root Cause
Developers included the full error stack in the response payload for debugging and never removed it.

### Recommended Fix
Remove `errorStack` from the error response. Log the full error server-side and return a generic message.

### Estimated Time
10 minutes

### Priority
High because it consistently leaks server internals on any backend error during login.

### Status
Pending

### Title
CORS policy allows all origins

### Severity
Medium

### Category
Security

### Location
backend/src/index.js

### Problem
The CORS middleware is initialized with no options (`app.use(cors())`), which sets `Access-Control-Allow-Origin: *`. Any external website can make authenticated API requests from a user's browser if the user has an active session token stored.

### Root Cause
CORS was configured with default permissive settings instead of restricting to the frontend origin.

### Recommended Fix
Configure CORS with specific allowed origins (e.g., `cors({ origin: 'http://localhost:3000' })`) and restrict methods/headers.

### Estimated Time
15 minutes

### Priority
Medium because it increases the attack surface for XSS-based token theft.

### Status
Pending

### Title
API response shapes are inconsistent across all endpoints

### Severity
Medium

### Category
Backend

### Location
backend/src/routes/auth.js, doctors.js, patients.js, appointments.js, queue.js, reports.js

### Problem
Every endpoint group uses a different response envelope. Login returns `{status, data: {token, user}}`, Register returns `{message, user}`, /me returns a flat user object, Patients returns `{success, patients, pagination}`, Doctors returns a raw array, Queue returns a raw array, Appointments returns `{success, count, appointments}`, Reports returns `{success, timeTakenMs, data}`. This forces inconsistent parsing logic on the frontend and makes API integration fragile.

### Root Cause
No API response contract or shared formatting utility was established. Each route handler was written independently.

### Recommended Fix
Define a standard response wrapper (e.g., `{success, data, error, meta}`) and apply it consistently. Update the frontend to use the same parsing pattern everywhere.

### Estimated Time
2-3 hours

### Priority
Medium because it causes maintenance overhead and increases the chance of frontend parsing errors.

### Status
Pending

### Title
No rate limiting on authentication endpoints

### Severity
Medium

### Category
Security

### Location
backend/src/routes/auth.js

### Problem
The login and registration endpoints have no rate limiting, IP-based throttling, or account lockout mechanism. An attacker can brute-force passwords or spam registrations without restriction.

### Root Cause
No rate-limiting middleware (e.g., express-rate-limit) was installed or configured.

### Recommended Fix
Add rate limiting middleware to auth routes (e.g., 5 attempts per minute per IP for login). Consider account lockout after repeated failures.

### Estimated Time
30 minutes

### Priority
Medium because it enables brute-force credential attacks.

### Status
Pending

### Title
No request cancellation on frontend fetches causes race conditions

### Severity
Medium

### Category
Frontend

### Location
frontend/src/app/dashboard/page.js

### Problem
Patient search, pagination, and filter changes each trigger fetch calls with no AbortController. When the user rapidly changes filters or pages, multiple in-flight requests compete. A slow response from an earlier request can overwrite the result of a later, more relevant request, causing the UI to show stale or incorrect data.

### Root Cause
Fetch calls are fire-and-forget with no mechanism to cancel stale requests.

### Recommended Fix
Use AbortController to cancel in-flight requests when dependencies change. Create a custom hook or wrapper that handles this pattern.

### Estimated Time
1-2 hours

### Priority
Medium because it causes visible UI flicker and data inconsistency during normal usage.

### Status
Pending

### Title
DOM element ID refs used instead of React state for form inputs

### Severity
Medium

### Category
Frontend

### Location
frontend/src/app/dashboard/page.js

### Problem
The walk-in checkin form at lines 776-777 uses `document.getElementById('walkin-patient').value` and `document.getElementById('walkin-doctor').value` to read form values. This bypasses React's state management, ties logic to DOM element IDs (fragile), and makes the form values invisible to React DevTools.

### Root Cause
The developer used imperative DOM access instead of controlled React state, likely for speed.

### Recommended Fix
Convert the checkin form to use controlled React state (useState) like the other forms in the component. Read values from state instead of the DOM.

### Estimated Time
30 minutes

### Priority
Medium because it creates a fragile, non-React-idiomatic pattern that can break if DOM structure changes.

### Status
Pending

### Title
Doctor queue check-in can crash from undefined doctor match

### Severity
High

### Category
Frontend

### Location
frontend/src/app/dashboard/page.js

### Problem
At line 845, the code calls `matchedDoc.id` on the result of `doctorsList.find(d => d.userId === user.id)`. If the current doctor user is not linked to any doctor record in the database (e.g., an admin or receptionist accidentally viewing the doctor tab), `matchedDoc` is undefined and the code throws "Cannot read properties of undefined (reading 'id')".

### Root Cause
The code assumes `doctorsList.find()` always returns a result without a null guard.

### Recommended Fix
Add an optional chaining check (`matchedDoc?.id`) and handle the null case with a user-friendly message or early return.

### Estimated Time
15 minutes

### Priority
High because it crashes the appointment workflow if the doctor mapping is missing.

### Status
Pending

### Title
Appointment PATCH endpoint does not validate status value

### Severity
Medium

### Category
Backend

### Location
backend/src/routes/appointments.js

### Problem
The PATCH /api/appointments/:id endpoint accepts any string as the `status` field. While Prisma's enum validation may catch invalid values at the database layer, there is no application-level validation to ensure the status is one of PENDING, COMPLETED, or CANCELLED. Invalid values produce a 500 error instead of a clear 400.

### Root Cause
The status update was implemented without input validation against the allowed enum values.

### Recommended Fix
Validate the status against the AppointmentStatus enum values before passing it to Prisma.

### Estimated Time
15 minutes

### Priority
Medium because it causes confusing 500 errors on invalid input instead of clear 400s.

### Status
Pending

### Title
Queue PATCH endpoint allows invalid status transitions

### Severity
Medium

### Category
Backend

### Location
backend/src/routes/queue.js

### Problem
The PATCH /api/queue/:id endpoint allows any status to be set at any time. A token can transition from COMPLETED back to WAITING, or SKIPPED back to CALLING. There is no state machine enforcement for queue token lifecycle.

### Root Cause
Status transitions were not modeled as a state machine. Any role can set any status at any time.

### Recommended Fix
Implement a status transition map (WAITING -> CALLING -> COMPLETED/SKIPPED) and reject invalid transitions with a 400 error.

### Estimated Time
30-45 minutes

### Priority
Medium because it can corrupt queue ordering and confuse live monitor displays.

### Status
Pending

### Title
No CASCADE delete handling on related records

### Severity
Medium

### Category
Database

### Location
backend/prisma/schema.prisma, backend/src/routes/patients.js

### Problem
The DELETE /api/patients/:id route attempts to delete a patient directly. If the patient has related appointments or queue tokens, Prisma/PostgreSQL throws a foreign key constraint violation error because no `onDelete` behavior is configured. This returns a 500 error instead of a graceful response.

### Root Cause
The schema uses default referential actions (NoAction in PostgreSQL), and the route does not handle or cascade related records before deletion.

### Recommended Fix
Configure `onDelete: Cascade` on Appointment and QueueToken relations, or delete related records in a transaction before deleting the parent.

### Estimated Time
30 minutes

### Priority
Medium because deleting patients with appointment history fails unpredictably.

### Status
Pending

### Title
No createdAt/updatedAt timestamps on most models

### Severity
Low

### Category
Database

### Location
backend/prisma/schema.prisma

### Problem
Only the User model has a `createdAt` field. Patient, Doctor, Appointment, and QueueToken models either lack or don't consistently track modification time (`updatedAt`). This makes it impossible to audit when records were last changed.

### Root Cause
The schema was designed without audit timestamps.

### Recommended Fix
Add `updatedAt DateTime @updatedAt` and ensure `createdAt` is present on all models.

### Estimated Time
15 minutes

### Priority
Low because it doesn't affect functionality, but reduces auditability.

### Status
Pending

### Title
No auto-logout or token invalidation on 401 responses

### Severity
Medium

### Category
Frontend

### Location
frontend/src/context/AuthContext.js, frontend/src/app/dashboard/page.js

### Problem
When the backend returns a 401 (e.g., expired or invalid token), the frontend silently continues making API calls with the same invalid token. There is no middleware or interceptor to detect 401 responses, clear stale credentials, and redirect to the login page.

### Root Cause
The authentication context does not handle 401 responses globally. Each fetch call handles errors independently.

### Recommended Fix
Create a centralized API client or fetch wrapper that intercepts 401 responses, calls logout(), and redirects to /login.

### Estimated Time
1-2 hours

### Priority
Medium because expired sessions leave users in a broken state with no feedback.

### Status
Pending

### Title
Submit buttons lack loading/disabled state during API calls

### Severity
Low

### Category
Frontend

### Location
frontend/src/app/dashboard/page.js

### Problem
The appointment booking form submit button and the walk-in checkin button are not disabled while their respective API calls are in progress. Users can click multiple times, triggering duplicate bookings or checkins.

### Root Cause
No loading state is tracked for booking or checkin operations, and the buttons have no disabled state based on those flags.

### Recommended Fix
Add boolean state variables for each async operation and set `disabled` on the buttons during the API call.

### Estimated Time
20 minutes

### Priority
Low because the backend has its own duplicate protections (however imperfect), but the frontend should still prevent double-submit.

### Status

Pending

### Title
Stale closure on refreshCount in queue polling

### Severity
Low

### Category

Frontend

### Location
frontend/src/app/queue/page.js

### Problem
The setInterval callback at line 48 logs `refreshCount + 1` but captures the initial value of `refreshCount` (0) in its closure because the effect dependency array is empty. The log always shows "Poll #1" regardless of how many times it fires.

### Root Cause
The effect has `[]` as dependencies, so the closure captures the initial render's `refreshCount` value.

### Recommended Fix
Either use the functional updater form or add `refreshCount` to the dependency array (which would require proper interval cleanup).

### Estimated Time
10 minutes

### Priority
Low because only the log message is wrong. The actual counter via setRefreshCount(prev => prev + 1) works correctly.

### Status
Pending

### Title
SQL error messages leaked to client in doctor search

### Severity
Medium

### Category
Security

### Location
backend/src/routes/doctors.js

### Problem
The doctor search endpoint returns `sqlMessage: error.message` in its error response. This reveals raw database error messages including schema information that aids SQL injection probing.

### Root Cause
The developer included the raw database error in the response for debugging purposes.

### Recommended Fix
Log the database error server-side and return a generic error message to the client.

### Estimated Time
10 minutes

### Priority
Medium because it provides useful feedback to attackers attempting SQL injection.

### Status
Pending

### Title
No input validation on internationalization fields (phone, age, email)

### Severity
Medium

### Category
Backend

### Location
backend/src/routes/patients.js

### Problem
The patient registration endpoint does not validate phone number format (accepts "abc"), age range (accepts negative numbers and NaN), or email format (accepts arbitrary strings). This allows garbage data to be stored in the database.

### Root Cause
The backend performs existence checks but no format or range validation on input fields.

### Recommended Fix
Add validation middleware or in-route checks: phone regex, age range (0-150), email format validation. Return 400 with clear messages for each.

### Estimated Time
30 minutes

### Priority
Medium because invalid data propagates to the database and causes issues downstream.

### Status
Pending

### Title
Missing security headers (helmet)

### Severity
Low

### Category
Security

### Location
backend/src/index.js

### Problem
The Express app does not use the helmet middleware, so it lacks standard security headers like X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, and Content-Security-Policy.

### Root Cause
Security headers were not configured.

### Recommended Fix
Install and configure helmet middleware.

### Estimated Time
15 minutes

### Priority
Low because it's a defense-in-depth measure, not an active vulnerability.

### Status
Pending

### Title
availableFrom and availableTo stored as plain strings

### Severity
Low

### Category
Database

### Location
backend/prisma/schema.prisma

### Problem
Doctor available hours are stored as String fields instead of DateTime or a dedicated time type. This enables inconsistent formats (e.g., "9:00" vs "09:00") and prevents time-based queries.

### Root Cause
String was chosen for simplicity rather than using a proper time representation.

### Recommended Fix
Change to a proper time format (e.g., store minutes since midnight as Int, or use PostgreSQL TIME type via Prisma).

### Estimated Time
30 minutes

### Priority
Low because the current implementation works for basic display, but breaks for time-based scheduling logic.

### Status
Pending

### Title
Unused icon imports in Dashboard component

### Severity
Low

### Category
Frontend

### Location
frontend/src/app/dashboard/page.js

### Problem
The Dashboard component imports `Sparkles`, `CheckCircle`, and `Volume2` from lucide-react but never uses any of these icons in the JSX. This adds unnecessary bundle size and creates confusion about which icons are actually available.

### Root Cause
Icons were imported during development and never cleaned up.

### Recommended Fix
Remove the unused icon imports from the import statement.

### Estimated Time
5 minutes

### Priority
Low because it has minimal impact on bundle size but improves code clarity.

### Status
Pending

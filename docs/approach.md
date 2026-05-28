# 1st i read index.js after setup the code base i saw 3 error there

## ERROR 1: Improper Error Handling in Global Error Handler

```js
// GLOBAL ERROR HANDLER
// BUG: Improper error handling. It returns the raw error stack trace to the client,
// which leaks details about database types, schema layout, and file paths.
app.use((err, req, res, next) => {
  console.error("[CRITICAL-ERROR]:", err);
  res.status(500).json({
    message: "An unexpected internal server error occurred!",
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});
```

> issue was that it returns the raw error stack trace to the client, which leaks details about database types, schema layout, and file paths. I fixed it by removing the `error` and `stack` properties from the response object.

> FIX: just return a generic error message without exposing sensitive details:

```js
app.use((err, req, res, next) => {
  console.error("[CRITICAL-ERROR]:", err);
  res.status(500).json({
    message: "An unexpected internal server error occurred",
  });
});
```

## ERROR 2: Unhandled Rejection Handler

```js
// Catch unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Intentionally do not exit process so candidates see unhandled promise logs
});
```

> Current: Catches the promise rejection, logs it, and keeps the server running in an unstable state.
> Fix: Log it, then exit so the process manager (or Docker) can restart cleanly.

```js
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
```

## ERROR 3: Weak CORS Configuration

```js
// Enable CORS for all origins (weak/broad CORS config)
app.use(cors());
```

> issue was that it allows all origins, which can lead to security vulnerabilities such as Cross-Site Request Forgery (CSRF) and data leaks. I fixed it by restricting CORS to a specific origin defined in an environment variable.
> FIX: In production, this should be restricted to specific origins to prevent unauthorized access. Allowing all origins can lead to security vulnerabilities such as Cross-Site Request Forgery (CSRF) and data leaks.

```js
// Enable CORS for all origins
const cors = require("cors");
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true, // if you switch to cookie-based auth later
  }),
);
```

---
# MAJOR DISSION TAKEN : ADDED VITEST AND SUPERTEST FOR TESTING
---

# 2nd in index.js i tried to go routes line by line so i gone to auth.js inside route folder i see the formating of folder are wrong according to indstry level project they should devided into controller and service , routes and model and utils for (apires,apierror and asynchandel) but here all are in one file so i just move on and add this into refactor if i got time left . Other than that i see there are total = 11 bugs or error

## ERROR 1: Adding Optional jwt secret to the code base

```js
const JWT_SECRET =
  process.env.JWT_SECRET || "my-super-secret-secret-key-12345!!!";
```

> **Issue:** Hardcoded fallback secret is a critical security vulnerability. If `JWT_SECRET` env var is not set, the system uses a public default that anyone with source code access can forge valid tokens.
> **Fix:** Remove hardcoded fallback and use only environment variable

```js
const JWT_SECRET = process.env.JWT_SECRET;
```

> **Why This Fix:** System now fails fast if JWT_SECRET is not set, forcing proper environment configuration. No unsafe fallback means no accidental security breaches.

## ERROR 2: in the register route, it logs the entire request body, which may contain sensitive information such as passwords.

```js
// SENSITIVE CONSOLE LOG: Logging raw request bodies with cleartext passwords!
console.log("[DEBUG] Registering user with payload:", JSON.stringify(req.body));
```

> **Issue:** Logs entire request body including plaintext password. Passwords appear in server logs and log aggregation services where anyone with access can see them.
> **Fix:** Remove the console log statement that logs the entire request body.

> **Why This Fix:** Eliminates credential exposure in logs. No legitimate reason to log user passwords in production.

## ERROR 3: Missing Input Validation in Register Route

```js
// MISSING VALIDATION: Does not check if email is valid format or if password is strong
if (!email || !password || !name) {
  return res.status(400).json({ error: "All fields are required" });
}
```

> **Issue:** Accepts invalid email formats like "invalid-email", "user@", "@domain.com". Creates broken user records that cause issues in downstream systems.
> **Fix:** Add email format validation using regex

```js
if (!/\S+@\S+\.\S+/.test(email)) {
  return res.status(400).json({ error: "Invalid email format" });
}
if (password.length < 6) {
  return res.status(400).json({ error: "Password must be at least 6 characters long" });
}
```

> **Why This Fix:** Catches invalid emails before saving to database. Prevents garbage data and ensures emails are valid for password resets/verifications.

## ERROR 4: Inconsistent API Response in Register Route

```js
// INCONSISTENT API RESPONSE: Returns the created user object directly, including password hash!
// This is a major security flaw.
res.status(201).json({
  message: "User registered successfully",
  user,
});
```

> **Issue:** Returns entire user object from database including bcrypt password hash. Hash can be used for offline brute-force attacks.
> **Fix:** Return only safe fields and add token for consistency

```js
res.status(201).json({
  status: "success",
  data: {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  },
});
```

> **Why This Fix:** Explicitly selects only non-sensitive fields. Client receives JWT token for authentication but never sees password hash.

## ERROR 5: Improper Error Handling in Register Route

```js
// IMPROPER ERROR HANDLING: Leaking database errors and details
console.error("Registration error:", error);
res.status(500).json({
  error: "Server error during registration",
  databaseError: error.message
});
```

> **Issue:** Returns `error.message` which contains SQL errors revealing database schema, constraint names, and database version/type. Helps attackers understand system internals.
> **Fix:** Return only generic error message to client

```js
catch (error) {
  console.error("Registration error:", error);
  res.status(500).json({
    error: "Server error during registration",
  });
}
```

> **Why This Fix:** Server logs errors internally for debugging. Client receives only generic message. No information leakage to attackers.

## ERROR 6: Sensitive Data Exposure in Login Route

```js
// SENSITIVE CONSOLE LOG: Logging plain-text passwords on login attempts!
console.log(
  `[AUTH] Login attempt for email: ${req.body.email} with password: ${req.body.password}`,
);
```

> **Issue:** Logs plaintext password for EVERY login attempt. Passwords visible in server logs and log aggregation services. Severe security and compliance violation.
> **Fix:** Only log email, never password

```js
console.log(`[AUTH] Login attempt for email: ${req.body.email}`);
```

> **Why This Fix:** Email is safe to log (shows WHO attempted login). Password must never be logged anywhere in any system.

## ERROR 7: Missing Input Validation in Login Route

```js
// MISSING VALIDATION: Does not check if email is valid format or if password is provided
if (!email || !password) {
  return res.status(400).json({ error: "Email and password are required" });
}
```

> **Issue:** Accepts invalid email formats for login. No validation that password meets minimum requirements. Validation was nested inside required field check.
> **Fix:** Add proper email format validation

```js
if (!/\S+@\S+\.\S+/.test(email)) {
  return res.status(400).json({ error: "Invalid email format" });
}
if (password.length < 6) {
  return res.status(400).json({ error: "Password must be at least 6 characters long" });
}
```

> **Why This Fix:** Rejects malformed login attempts early. Consistent validation across all endpoints. Better error messages to frontend.

## ERROR 8: JWT EXPIRY WAS 365 DAYS WHICH IS TOO LONG

```js
{ expiresIn: '365d' }
```

> **Issue:** 365-day expiry means if token is stolen, attacker has 1 year to use it. User cannot force logout by changing password (token still valid). Industry standard is 1-24 hours.
> **Fix:** Reduce to 7 hours and make configurable

```js
{ expiresIn: process.env.JWT_EXPIRY || "7h" }
```

> **Why This Fix:** 7 hours balances security (short window if compromised) with usability (covers normal workday). Configurable for different deployments. Aligns with industry best practices.

## ERROR 9: Inconsistent API Response in Login Route

**Original Responses:**

Register response:
```json
{
  "message": "User registered successfully",
  "userId": "xxx"
}
```

Login response:
```json
{
  "status": "success",
  "data": {
    "token": "xxx",
    "user": { "id": "...", "email": "...", "name": "...", "role": "..." }
  }
}
```

Me response:
```json
{
  "id": "xxx",
  "email": "...",
  "name": "...",
  "role": "..."
}
```

> **Issue:** Three different response formats. Frontend must handle each differently. Violates API consistency principle. Increases complexity and bugs.
> **Fix:** Standardize all endpoints to use same format

```js
res.status(201).json({
  status: "success",
  data: {
    token,  // if login/register
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  },
});
```

> **Why This Fix:** Frontend can use single response handler for all auth endpoints. Predictable structure. Easier to test and maintain. Follows REST API best practices.

## ERROR 10: Improper Error Handling in Login Route

```js
res.status(500).json({
  error: "Internal Server Error",
  errorStack: error.stack
});
```

> **Issue:** Returns full JavaScript stack trace revealing file paths, function names, library versions. Helps attackers identify vulnerabilities.
> **Fix:** Remove stack trace from response

```js
catch (error) {
  console.error("Login error:", error);
  res.status(500).json({ error: "Internal Server Error" });
}
```

> **Why This Fix:** Server logs full error internally for debugging. Client receives only generic message. No information leakage to attackers.

## ERROR 11: get me route response is inconsistent with other routes

```js
res.json(user);  // Flat object, breaks consistency
```

> **Issue:** Returned flat user object without `status` and `data` wrapper. Inconsistent with other auth endpoints. Frontend must special-case this endpoint.
> **Fix:** Use same format as register and login

```js
res.status(201).json({
  status: "success",
  data: {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  },
});
```

> **Why This Fix:** Matches register and login format. Frontend uses single response handler. Consistent API design.

---

## TESTING & VALIDATION

**Comprehensive Test Suite Created: `backend/tests/auth.test.js`**

✅ **31/31 Tests Passing**

- Register endpoint: 10 tests (validation, security, format)
- Login endpoint: 10 tests (authentication, JWT, validation)
- Me endpoint: 7 tests (token verification, format)
- Response consistency: 1 test
- Security: 3 tests

**Key Tests Verify:**
- ✅ Valid registration returns token + non-sensitive user data
- ✅ Login with valid credentials returns JWT
- ✅ Invalid email format rejected on register & login
- ✅ Password < 6 chars rejected on register & login
- ✅ Duplicate email registration rejected
- ✅ Me endpoint requires valid token
- ✅ All endpoints use consistent `status/data` response format
- ✅ No plaintext passwords leak in responses
- ✅ JWT token has reasonable expiry (1-24 hours, not 365d)
- ✅ Error stack traces never exposed to client
- ✅ Database errors never exposed to client
- ✅ JWT_SECRET uses environment (no hardcoded fallback)

---

## ERROR 12: JWT Verification Ignores Expiration and Admin Bypass in Middleware

```js
const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-secret-key-12345!!!';
const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
```

> **Issue:** Expired tokens were still accepted, and the middleware used a hardcoded fallback secret. That made old or forged tokens valid. The legacy admin helper also skipped role checks, so any authenticated user could perform admin actions.

> **Fix:** Require `JWT_SECRET`, remove `ignoreExpiration`, return a generic token error, and enforce `authorize('ADMIN')` on protected admin routes.

```js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

const decoded = jwt.verify(token, JWT_SECRET);
```

> **Why This Fix:** Tokens now expire normally, the app no longer falls back to a weak secret, and admin-only actions are protected by a real role check. This closes both authentication and authorization bypasses at the middleware layer.

> **Status:** ✅ FIXED & TESTED (5 middleware tests passing, 42/42 backend tests passing)


---

# MAJOR DECISION TAKEN: ADDED NEON DB

## Problem

The app was still tied to a local PostgreSQL workflow, which is fine for development but awkward for cloud deployment.

## Why It Happened

The original setup assumed Docker or local Postgres only, so deployment needed a managed database provider.

## Solution

- Switched `backend/.env` to a Neon Postgres connection string
- Ran Prisma migrations against Neon
- Seeded Neon with the existing seed data

## Why This Fix

Neon gives a managed PostgreSQL database that works cleanly for cloud deployment and removes the need to run local Docker DB in production.

## Tradeoffs

- CI still uses a disposable Postgres service for tests
- Local development now depends on Neon unless the old Docker URL is restored
- Network access is required for local dev if Neon is used

---

# Middleware Auth Security Fix

## Problem

The middleware layer had four distinct security issues:

1. **Hardcoded JWT secret fallback** — `backend/src/middleware/auth.js` line 3 used `process.env.JWT_SECRET || 'my-super-secret-secret-key-12345!!!'`. Anyone with source code access could forge valid JWTs for any user role.
2. **Token expiration bypassed** — `jwt.verify(token, JWT_SECRET, { ignoreExpiration: true })` at line 28 accepted expired tokens as valid. A stolen token remained usable indefinitely.
3. **Error detail leak** — The catch block returned `{ error: 'Invalid token', details: error.message }`, leaking the specific reason (e.g., "jwt expired") and JWT library internals to attackers.
4. **Admin authorization bypass** — `authorizeAdminOnlyLegacy` had the role check commented out, making it a no-op. Any authenticated user (including PATIENT role) could call admin-only routes like DELETE /api/patients/:id.

## Why It Happened

All four issues stem from junior development patterns and a lack of security review:

- The hardcoded fallback was a "convenience" for local development that was never removed from production code.
- `ignoreExpiration: true` was likely added to silence errors during testing and left in without understanding the security implications.
- Including `details: error.message` in error responses is a common debugging habit that exposes internals.
- `authorizeAdminOnlyLegacy` was probably stubbed as a placeholder and never actually implemented, but the route was still wired to use it.

## Solution

Each issue was fixed with a minimal, targeted change:

1. **JWT secret fallback removed:**
   ```js
   const JWT_SECRET = process.env.JWT_SECRET;
   if (!JWT_SECRET) {
     throw new Error('JWT_SECRET is required');
   }
   ```
   The app now crashes at module load if `JWT_SECRET` is not set, rather than silently falling back to a weak default.

2. **`ignoreExpiration: true` removed:**
   ```js
   const decoded = jwt.verify(token, JWT_SECRET);
   ```
   Tokens now expire at their `exp` claim. `jwt.verify` throws a `TokenExpiredError` for expired tokens and `JsonWebTokenError` for invalid ones.

3. **Error detail leak closed:**
   ```js
   return res.status(401).json({ error: 'Invalid or expired token' });
   ```
   A single generic message is returned regardless of the specific failure reason. The full error is logged server-side.

4. **Admin authorization fixed:**
   ```js
   const authorizeAdminOnlyLegacy = authorize('ADMIN');
   ```
   The legacy helper now delegates to the existing `authorize('ADMIN')` middleware instead of being a no-op. The `patients.js` route using it automatically inherits the correct enforcement.

## Why This Fix

- **Fail-fast** — Removing the fallback makes the deployment surface misconfiguration immediately rather than hiding it behind an insecure default.
- **Minimal diff** — Each fix is a single-line change (or removal). No restructuring of the middleware layer was needed.
- **Defense in depth** — All four fixes close independent attack vectors. Even if one layer is compromised, the others still protect.
- **No regressions** — The 5 middleware tests (expired token, invalid token, missing token, admin-only route, patient-role denied) plus the existing 37 backend tests all pass at 42/42.

## Tradeoffs

- `throw new Error('JWT_SECRET is required')` at module load prevents the server from starting if the env var is missing. This is intentional — it is better to fail at startup than serve with a broken auth layer.
- The generic 401 error message ("Invalid or expired token") does not distinguish between expired and malformed tokens. This is also intentional — distinguishing them helps attackers probe the system.

---

# MAJOR DECISION: Prisma 6 Upgrade & Schema Improvements

## Problem

The Prisma schema was functional but missing basic production features:

1. **No `updatedAt` timestamps** — Couldn't tell when a record was last modified
2. **No indexes** — Every query did a full table scan. Fine at 10 rows, terrible at 10,000
3. **No unique constraints** — Same doctor could be double-booked, duplicate queue tokens possible
4. **No cascade deletes** — Deleting a patient or doctor threw foreign key errors
5. **Prisma 7 breaking change** — `npx prisma` pulled Prisma 7 which removed `url` from schema config

## Why It Happened

The schema was designed as a quick prototype. Constraints, indexes, and cascades were deferred. Prisma 5 was fine for development but `npx prisma` in CI and some environments auto-pulled Prisma 7.

## Solution

**Prisma 6 upgrade:**
- Changed `backend/package.json`: `"prisma": "^5.14.0"` → `"^6.5.0"`, `"@prisma/client": "^5.14.0"` → `"^6.5.0"`
- Reinstalled with `npm install --prefix backend`
- Regenerated client, verified 42/42 tests pass

**Schema improvements:**
- Added `updatedAt DateTime @default(now()) @updatedAt` to all 5 models
- Added 6 indexes: `Appointment(doctorId, status)`, `Appointment(patientId)`, `Doctor(department)`, `Doctor(specialization)`, `QueueToken(doctorId, createdAt)`, `QueueToken(status)`
- Added 2 unique constraints: `@@unique([doctorId, appointmentDate])` on Appointment, `@@unique([doctorId, tokenNumber, createdAt])` on QueueToken
- Added 4 CASCADE deletes: User→Doctor, Patient→Appointment, Patient→QueueToken, Appointment→QueueToken


---

# 3rd i read doctors.js and fixed 10 bugs

## ERROR 1: SQL Injection Vulnerability in Doctor Search Endpoint

```js
// BEFORE
let query = 'SELECT * FROM "Doctor"';
const conditions = [];

if (search) {
  conditions.push(`name ILIKE $${values.length + 1}`);
  values.push(`%${search}%`);
}
const doctors = await prisma.$queryRawUnsafe(query);
```

> **Issue:** Using `$queryRawUnsafe` with string concatenation allows SQL injection. Attacker could craft search like `'; DROP TABLE "Doctor"; --` to manipulate queries.

> **Fix:** Use Prisma safe filters instead

```js
// AFTER - BUG FIXED
if (search) {
  where.name = { contains: String(search), mode: "insensitive" };
}
const doctors = await prisma.doctor.findMany({ where });
```

## ERROR 2: Error Message Leak in GET /

```js
// BEFORE
res.status(500).json({ error: "Database execution failure", sqlMessage: error.message });
```

> **Issue:** Returning `error.message` exposes database schema details, table names, constraint errors to attackers.

> **Fix:** Return generic message, log details server-side

```js
// AFTER - BUG FIXED
console.error("doctors.list error:", error);
res.status(500).json({ error: "Internal Server Error" });
```

## ERROR 3: Inconsistent Response Format in GET /

```js
// BEFORE
res.json(doctors);
```

> **Issue:** Returns array directly, doesn't match auth.js pattern of `{status, data}` structure.

> **Fix:** Standardize response format

```js
// AFTER - BUG FIXED
res.json({
  status: "success",
  data: {
    doctors,
    pagination: { page, limit, total, totalPages },
  },
});
```

## ERROR 4: Performance - Sequential Async Calls in GET /stats

```js
// BEFORE
const totalDoctors = await prisma.doctor.count();
const surgeonsCount = await prisma.doctor.count({...});
const averageFee = await prisma.doctor.aggregate({...});
const highestExperience = await prisma.doctor.aggregate({...});
```

> **Issue:** Four independent database calls run sequentially, blocking each other. With network latency, total time = sum of all 4 calls.

> **Fix:** Run in parallel using `Promise.all()`

```js
// AFTER - BUG FIXED
const [totalDoctors, surgeonsCount, averageFee, highestExperience] = await Promise.all([
  prisma.doctor.count(),
  prisma.doctor.count({where: {department: "Surgery"}}),
  prisma.doctor.aggregate({_avg: {consultationFee: true}}),
  prisma.doctor.aggregate({_max: {experience: true}}),
]);
```

## ERROR 5: Inconsistent Response Format in GET /stats

```js
// BEFORE
res.json({
  success: true,
  data: {...},
  debugInfo: {executionTimeMs, notes: "..."},
});
```

> **Issue:** Uses `success: true` instead of `status: "success"`. Exposes `debugInfo` field which shouldn't leak internal details.

> **Fix:** Match auth.js response pattern

```js
// AFTER - BUG FIXED
res.json({
  status: "success",
  data: {
    total: totalDoctors,
    surgeons: surgeonsCount,
    averageFee: Math.round(averageFee._avg.consultationFee || 0),
    maxExperience: highestExperience._max.experience || 0,
    executionTimeMs: durationMs,
  },
});
```

## ERROR 6: Error Message Leak in GET /stats

```js
// BEFORE
res.status(500).json({ error: error.message });
```

> **Issue:** Returns `error.message` exposing internal error details.

> **Fix:** Return generic message only

```js
// AFTER - BUG FIXED
console.error("doctors.stats error:", error);
res.status(500).json({ error: "Internal Server Error" });
```

## ERROR 7: No Pagination in GET /

```js
// BEFORE
const doctors = await prisma.doctor.findMany();
```

> **Issue:** Loads all doctors without limit. On 10,000+ records, wastes memory and bandwidth. No bounds checking.

> **Fix:** Add pagination with safe defaults

```js
// AFTER - BUG FIXED
const page = Math.max(1, parseInt(req.query.page || "1", 10));
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10", 10)));
const skip = (page - 1) * limit;
```

## ERROR 8: No Input Validation in GET /

```js
// BEFORE
const { search, specialization } = req.query;
// search used without length check
```

> **Issue:** Unbounded search parameter could be 100KB+ string, causing DoS via expensive LIKE queries.

> **Fix:** Validate search term length

```js
// AFTER - BUG FIXED
if (search && String(search).length > 100) {
  return res.status(400).json({ error: "Search term too long" });
}
```

## ERROR 9: Exposing Full Objects in GET / and GET /:id

```js
// BEFORE
res.json(doctor);  // Returns ALL fields
```

> **Issue:** Returns all database fields without filtering. Could expose sensitive fields if schema changes.

> **Fix:** Use `.select()` to return only safe fields

```js
// AFTER - BUG FIXED
select: {
  id: true,
  name: true,
  specialization: true,
  department: true,
  consultationFee: true,
  experience: true,
  availableFrom: true,
  availableTo: true,
  createdAt: true,
  updatedAt: true,
},
```

## ERROR 10: Error Message Leak in GET /:id

```js
// BEFORE
res.status(500).json({ error: error.message });
```

> **Issue:** Returns `error.message` exposing internal details.

> **Fix:** Return generic message only

```js
// AFTER - BUG FIXED
console.error("doctors.getById error:", error);
res.status(500).json({ error: "Internal Server Error" });
```
---

# Testing Discovery: Prisma `skip` Parameter Bug in doctors.js

## What Was Found

Running the test suite for doctors.js revealed a **Prisma v6 type validation bug** not caught during manual code review.

## The Bug

```js
// In findMany with pagination:
const [total, doctors] = await Promise.all([
  prisma.doctor.count({ where }),
  prisma.doctor.findMany({
    where,
    take: limit,
    skip,  // ❌ Could be undefined on first page
    ...
  }),
]);
```

When page=1: `skip = (1-1) * 10 = 0`

Prisma v6 requires `skip` to be a number, never undefined. Even `0` must be explicitly provided.

## Error Message

```
PrismaClientValidationError: 
Argument `skip` is missing.
  + skip: Int
```

## Solution Applied

```js
skip: skip || 0,  // ✅ Always provide a number
```

## Why Tests Found This

1. Manual code review checked logic but missed Prisma type requirements
2. Prisma v6 is stricter than v5
3. First-page queries with skip=0 aren't commonly tested manually
4. Automated tests exercise ALL code paths including edge cases
5. Test suite runs immediately on code change, catching issues fast

## Lesson

**Testing is not optional — it catches bugs that code review misses.**

- Code review: ✅ Logic is correct
- Tests: ❌ Prisma throws on first page

## All 71 Tests Pass After Fix

- app.test.js: 6 tests ✅
- auth.test.js: 31 tests ✅  
- middleware.test.js: 5 tests ✅
- doctors.test.js: 29 tests ✅

---

# 4th i read queue.js and fixed 9 bugs

## ERROR 1: Race Condition in Token Generation

```js
// BEFORE
const currentMax = maxTokenResult._max.tokenNumber || 0;
const nextTokenNumber = currentMax + 1;

// Artificial 350ms sleep to simulate race window
await new Promise((resolve) => setTimeout(resolve, 350));

const newToken = await prisma.queueToken.create({
  data: {
    tokenNumber: nextTokenNumber,
    ...
  },
});
```

> **Issue:** Read current max, sleep 350ms, then create. Two concurrent requests read the same `currentMax`, both create `currentMax + 1`. The unique constraint catches it, but one request crashes with a Prisma error. Under real production load, network latency causes this naturally without the sleep.
>
> **Fix:** Wrap read and create in a `$transaction` for atomic token generation

```js
// AFTER - BUG FIXED
const newToken = await prisma.$transaction(async (tx) => {
  const maxTokenResult = await tx.queueToken.aggregate({
    where: { doctorId, queueDate: today },
    _max: { tokenNumber: true },
  });

  const nextTokenNumber = (maxTokenResult._max.tokenNumber || 0) + 1;

  return tx.queueToken.create({
    data: {
      tokenNumber: nextTokenNumber,
      ...
    },
  });
});
```

## ERROR 2: No Pagination in GET /

```js
// BEFORE
const tokens = await prisma.queueToken.findMany({
  where,
  include: { patient: true, doctor: true },
  orderBy: { createdAt: 'asc' },
});
res.json(tokens);
```

> **Issue:** Returns ALL tokens with no limit. On 10,000+ records, wastes memory and bandwidth. No way to page through results.
>
> **Fix:** Add pagination with safe defaults

```js
// AFTER - BUG FIXED
const page = Math.max(1, parseInt(req.query.page || "1", 10));
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
const skip = (page - 1) * limit;

const [total, tokens] = await Promise.all([
  prisma.queueToken.count({ where }),
  prisma.queueToken.findMany({ where, skip, take: limit, orderBy: { tokenNumber: "asc" }, select: {...} }),
]);
```

## ERROR 3: Inconsistent Response Format in GET /

```js
// BEFORE
res.json(tokens);
```

> **Issue:** Returns raw array directly. Doesn't match auth.js pattern of `{status, data}` structure.
>
> **Fix:** Standardize response format

```js
// AFTER - BUG FIXED
res.json({
  status: "success",
  data: {
    tokens,
    pagination: { page, limit, total, totalPages },
  },
});
```

## ERROR 4: Error Detail Leak in All Routes

```js
// BEFORE
res.status(500).json({ error: 'Failed to retrieve queue', details: error.message });
res.status(500).json({ error: 'Check-in failed', details: error.message });
res.status(500).json({ error: 'Failed to update queue token', details: error.message });
```

> **Issue:** Returns `details: error.message` on all three routes, exposing database schema info and Prisma errors to the client.
>
> **Fix:** Return generic message only, log details server-side

```js
// AFTER - BUG FIXED
console.error("queue.list error:", error);
res.status(500).json({ error: "Internal Server Error" });
```

## ERROR 5: Inconsistent Response Format in POST /checkin

```js
// BEFORE
res.status(201).json({
  message: 'Checked in successfully. Token generated.',
  token: newToken,
});
```

> **Issue:** Uses `{message, token}` format, different from auth.js `{status, data}` pattern.
>
> **Fix:** Match auth.js response pattern

```js
// AFTER - BUG FIXED
res.status(201).json({
  status: "success",
  data: { token: newToken },
});
```

## ERROR 6: No Default Date Filter in GET /

```js
// BEFORE
const where = {};
if (doctorId) where.doctorId = doctorId;
if (status) where.status = status;
// No date filter — returns tokens from ALL time
```

> **Issue:** No date filtering by default. Returns today's tokens AND yesterday's AND last month's. Queue board should show current day by default.
>
> **Fix:** Default to today's date

```js
// AFTER - BUG FIXED
const today = new Date();
today.setHours(0, 0, 0, 0);
const where = { queueDate: today };
if (doctorId) where.doctorId = doctorId;
if (status) where.status = status;
```

## ERROR 7: No Status Validation in PATCH /:id

```js
// BEFORE
if (!status) {
  return res.status(400).json({ error: 'Status is required' });
}
// No check if status is a valid enum value
```

> **Issue:** Any string is accepted as status. Setting status to garbage string bypasses the QueueStatus enum entirely.
>
> **Fix:** Validate against valid statuses

```js
// AFTER - BUG FIXED
const validStatuses = ["WAITING", "CALLING", "COMPLETED", "SKIPPED"];
if (!validStatuses.includes(status)) {
  return res.status(400).json({
    error: "Invalid status. Must be one of: WAITING, CALLING, COMPLETED, SKIPPED",
  });
}
```

## ERROR 8: No 404 Check on PATCH /:id

```js
// BEFORE
const updatedToken = await prisma.queueToken.update({
  where: { id: req.params.id },
  data: { status },
});
```

> **Issue:** If token ID doesn't exist, Prisma throws `RecordNotFound` error caught as 500 with error detail leak instead of clean 404.
>
> **Fix:** Check token exists before updating

```js
// AFTER - BUG FIXED
const existingToken = await prisma.queueToken.findUnique({
  where: { id: req.params.id },
});
if (!existingToken) {
  return res.status(404).json({ error: "Queue token not found" });
}
```

## ERROR 9: Exposing Full Objects via include

```js
// BEFORE
include: {
  patient: true,
  doctor: true,
},
```

> **Issue:** Returns ALL fields of patient and doctor objects including sensitive data. Unbounded payload size.
>
> **Fix:** Use `select` to return only safe fields

```js
// AFTER - BUG FIXED
select: {
  id: true,
  tokenNumber: true,
  queueDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: { id: true, name: true, phoneNumber: true },
  },
  doctor: {
    select: { id: true, name: true, specialization: true, department: true },
  },
},
```

## All 83 Tests Pass After Fix

- app.test.js: 6 tests ✅
- auth.test.js: 31 tests ✅
- middleware.test.js: 5 tests ✅
- doctors.test.js: 29 tests ✅
- queue.test.js: 12 tests ✅

# Database Schema — Issues & Fixes

Simple explanation of what was wrong with the database schema and how we fixed it.

---

## What Was the Old Schema Like?

The schema had 5 tables (User, Doctor, Patient, Appointment, QueueToken) with basic fields and relationships. It worked for a demo but was missing a lot of production essentials.

---

## Problems We Found

### 1. No "Last Updated" Timestamps

Every table had a `createdAt` field (when the record was created), but **none** had `updatedAt` (when it was last modified).

**Why it matters:** You can't tell if a patient's info was updated, if an appointment was rescheduled, or if a doctor's fee was changed. For a hospital system, audit trails are essential.

**Fix:** Added `updatedAt DateTime @default(now()) @updatedAt` to all 5 models. Existing records get backfilled with the current timestamp.

---

### 2. Missing Indexes (Slow Queries)

An index is like a book's index — without it, the database reads every row to find what you need.

**What was missing:**

| Table | Column(s) | Why It Needs an Index |
|-------|-----------|----------------------|
| Appointment | doctorId + status | Doctor looks up their appointments by status daily |
| Appointment | patientId | Finding all appointments for a patient |
| Doctor | department | Filtering doctors by department |
| Doctor | specialization | Searching doctors by specialty |
| QueueToken | doctorId + createdAt | Daily queue report by doctor |
| QueueToken | status | Finding all waiting/calling/completed tokens |

**Why it matters:** With 10 patients, these queries are instant. With 10,000 patients, every query does a full table scan — seconds instead of milliseconds.

**Fix:** Added 6 indexes using Prisma's `@@index([column])` syntax.

---

### 3. No Unique Constraints (Data Corruption)

A unique constraint prevents duplicate data.

**What was missing:**

| Table | Constraint | Problem |
|-------|-----------|---------|
| Appointment | Same doctor + same time = no duplicates | Two patients could be booked with Dr. House at 9 AM sharp |
| QueueToken | Same doctor + same token number + same day = no duplicates | Race condition could assign token #5 to two different patients |

**Why it matters:** Double-booking means two patients show up at the same time. Duplicate tokens mean the queue display breaks.

**Fix:** Verified no existing duplicates, then added:
- `@@unique([doctorId, appointmentDate])` on Appointment
- `@@unique([doctorId, tokenNumber, createdAt])` on QueueToken

---

### 4. No Cascade Deletes (Broken Deletions)

When Table A has a foreign key pointing to Table B, deleting a row from Table B can fail if Table A still references it.

**What was broken:**

| If You Delete This | These Still Reference It | What Happens |
|--------------------|-------------------------|--------------|
| A Patient | Appointments, Queue Tokens | Foreign key error — delete fails |
| A Doctor | Appointments, Queue Tokens | Foreign key error — delete fails |
| A User | Doctor profile | Foreign key error — delete fails |
| An Appointment | Queue Tokens | Foreign key error — delete fails |

**Why it matters:** You couldn't delete test data, clean up patients, or remove accounts without manually deleting related records first.

**Fix:** Added `onDelete: Cascade` to 4 relationships:
- Delete User → their Doctor profile goes too
- Delete Patient → their Appointments and Queue Tokens go too
- Delete Appointment → its Queue Token goes too

---

### 5. Old Prisma Version (5 → 6)

The project was on Prisma 5. Whenever `npx prisma` ran in CI or on a fresh machine, it sometimes pulled Prisma 7 instead, which completely changed how database URLs are configured.

**Fix:** Upgraded to Prisma 6 (`^5.14.0` → `^6.5.0`) — the latest major that still supports the current schema format. Just a version bump in `package.json` and reinstall. No code changes needed.

---

## Summary Table

| Problem | Tables Affected | Risk Before | Risk After |
|---------|----------------|-------------|------------|
| No updatedAt | All 5 | Can't audit changes | Tracked automatically |
| No indexes | Appointment, Doctor, QueueToken | Slow queries at scale | Fast indexed lookups |
| No unique constraints | Appointment, QueueToken | Double-booking, duplicate tokens | Rejected at database level |
| No cascade deletes | All relations | Delete operations fail | Clean cascading deletes |
| Prisma 5 | Whole project | Random Prisma 7 breakage | Stable Prisma 6 |

## Migration Status

- ✅ Migration file created: `20260528140000_add_indexes_cascades_timestamps`
- ✅ Applied to **Neon** (cloud production database)
- ✅ Applied to **Docker PostgreSQL** (local testing database)
- ✅ All 42 tests pass
- ⚠️ Schema file is the source of truth. Migration was applied manually.

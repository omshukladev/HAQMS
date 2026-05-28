# Frontend Fix Plan

Blueprint for systematically fixing all 25+ frontend issues, organized by dependency order.

---

## Project Structure Overview

```e
frontend/src/
├── app/
│   ├── layout.js              ← Root layout (30 lines) — 2 issues
│   ├── page.js                ← Landing page (83 lines) — 2 issues
│   ├── not-found.js           ← 404 page (45 lines) — 0 issues
│   ├── globals.css            ← Tailwind styles
│   ├── login/page.js          ← Login page (160 lines) — 3 issues
│   ├── dashboard/page.js      ← Main dashboard (1165 lines) — 10 issues ← BIGGEST
│   ├── queue/page.js          ← Queue monitor (214 lines) — 3 issues
│   └── patients/
│       └── [id]/
│           ├── page.js        ← MISSING — patient detail page
│           └── history-records/page.js  ← MISSING — history records page
├── context/
│   └── AuthContext.js         ← Auth state (140 lines) — 4 issues
└── components/
    └── common/Navbar.js       ← Shared nav (61 lines) — 0 issues
```

**Total: 10 file targets (8 existing + 2 missing), ~1,900 lines of code**

---

## Issue Count by File

| File | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| `context/AuthContext.js` | 0 | 2 | 1 | 1 | 4 |
| `app/layout.js` | 0 | 1 | 0 | 1 | 2 |
| `app/page.js` | 0 | 0 | 0 | 2 | 2 |
| `app/login/page.js` | 0 | 1 | 0 | 2 | 3 |
| `app/dashboard/page.js` | 2 | 4 | 3 | 0 | 10 |
| `app/queue/page.js` | 1 | 0 | 0 | 1 | 3 |
| `app/patients/[id]/page.js` (MISSING) | 0 | 0 | 1 | 0 | 1 |
| `app/patients/[id]/history-records/page.js` (MISSING) | 1 | 0 | 0 | 0 | 1 |
| **Total** | **3** | **8** | **7** | **7** | **25** |

---

## User Navigation Flow

```
Landing (page.js)
  │
  ├── Click "Staff Portal" ──→ Login (login/page.js)
  │                              │
  │                              ├── Success ──→ AuthContext stores JWT
  │                              │                │
  │                              │                └── Redirect ──→ Dashboard (dashboard/page.js)
  │                              │                                │
  │                              │                                ├── [RECEPTIONIST] Patient Registry tab
  │                              │                                │   ├── Search / filter patients
  │                              │                                │   ├── Register new patient
  │                              │                                │   ├── Delete patient
  │                              │                                │   └── Check-in patient (quick)
  │                              │                                │
  │                              │                                ├── [RECEPTIONIST] Scheduling tab
  │                              │                                │   ├── Book appointment
  │                              │                                │   └── Walk-in queue check-in
  │                              │                                │
  │                              │                                ├── [DOCTOR] Appointments tab
  │                              │                                │   ├── View scheduled appointments
  │                              │                                │   ├── Check-in / Complete appointments
  │                              │                                │   └── Click patient → view history modal
  │                              │                                │       └── "View Diagnostic Reports" → 404!! FEAT-1
  │                              │                                │
  │                              │                                ├── [DOCTOR] Queue tab
  │                              │                                │   └── Call / Skip / Complete patients
  │                              │                                │
  │                              │                                └── [ADMIN] Reports tab
  │                              │                                    └── Load doctor stats report
  │                              │
  │                              └── Fail ──→ Shows error, stays on login
  │
  └── Click "Live Public Monitor" ──→ Queue Monitor (queue/page.js)
                                        └── Auto-polls every 3s (MEMORY LEAK!)
```

---

## Fix Plan — Ordered by Dependencies

### Phase 0: Foundation (3 fixes)

Fix AuthContext and Layout first — every other file depends on them.

---

#### ✅ FIX-0A: AuthContext — Fix Hardcoded API URL
**Status:** Fixed

**File:** `context/AuthContext.js:18`

**What it does:** Provides `API_BASE_URL` to all components for API calls.

**Before:** `const API_BASE_URL = 'http://localhost:5000/api';` — hardcoded, breaks when deployed.

**After:** `const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';`

**Impact:** All API calls across the app start respecting the env var.

**Blocks:** Fixes URL-1.

---

#### ✅ FIX-0B: AuthContext — Add Auto-Logout on 401
**Status:** Fixed (via `fetchWithAuth` wrapper)

**File:** `context/AuthContext.js`

**What it does:** When JWT expires, the app should log out and redirect to login.

**Before:** API returns 401, user sees broken UI with no context.

**After:** `fetchWithAuth` wrapper intercepts 401 responses and calls `logout()`.

**Implementation:** Created `fetchWithAuth()` function in AuthContext that:
- Prepends `API_BASE_URL` to all requests
- Auto-attaches `Authorization: Bearer` header
- Calls `logout()` on 401 response

**Blocks:** Fixes SEC-4.

---

#### FIX-0C: Layout — Add Error Boundary
**File:** `app/layout.js`

**What it does:** Catches React render errors so the whole page doesn't white-screen.

**Before:** Any unhandled render error shows a white screen.

**After:** Add an `error.js` file (Next.js built-in error boundary) in `app/` directory.

**Blocks:** Fixes UX-4.

---

### Phase 1: Crash Fixes (4 fixes)

These prevent the app from breaking. Highest priority.

---

#### ✅ FIX-1A: Dashboard — Add Missing Link Import
**Status:** Fixed

**File:** `app/dashboard/page.js:903`

**What it does:** The `<Link>` component is used on line 903 but never imported.

**Before:** `ReferenceError: Link is not defined` when a doctor clicks a patient name to view diagnostic reports. App crashes entirely.

**After:** Add `import Link from 'next/link'` at the top of the file.

**Blocks:** Fixes CRASH-2.

---

#### ✅ FIX-1B: Dashboard — Guard Null User on Logout (CRASH-3)
**Status:** Fixed

**File:** `app/dashboard/page.js:17`

**What it does:** Prevents crash when `user` is null during the logout redirect window.

**Before:** `user.role` throws `Cannot read properties of null (reading 'role')` during the 2-3 second logout redirect.

**After:** Optional chaining `user?.role` in useState initializer + `if (!user) return null;` guard before JSX.

**Blocks:** Fixes CRASH-3.

---

#### FIX-1C: Dashboard — Guard Null medicalHistory
**File:** `app/dashboard/page.js:897`

**What it does:** Shows medical history in the doctor's patient modal.

**Before:** `selectedPatientHistory.medicalHistory.toUpperCase()` crashes with `Cannot read properties of null (reading 'toUpperCase')` when the patient has no medical history (e.g., Bruce Wayne, Clark Kent, Diana Prince seed data).

**After:** `selectedPatientHistory.medicalHistory?.toUpperCase() || 'No history recorded'`

**Blocks:** Fixes CRASH-1. Doctor cannot view patients without medical history.

**Dependencies:** None (inline expression fix).

**Relevant UI:** The "Medical Records" section in the doctor's appointment tab modal (lines 870-912).

---

#### FIX-1D: Dashboard — Guard Undefined Doctor Check-In
**File:** `app/dashboard/page.js:505`

**What it does:** The quick check-in button uses `doctorsList[0]?.id` to assign a doctor.

**Before:** If `doctorsList` hasn't loaded yet, `doctorsList[0]` is `undefined`, so `doctorsList[0]?.id` is `undefined`. Queue check-in call sends `undefined` as `doctorId`.

**After:** Add check: `doctorsList.length > 0 &&` before rendering the check-in button, or gray it out until doctors are loaded.

**Blocks:** Fixes DOM-2. Prevents silent failures during check-in.

**Dependencies:** None.

**Relevant UI:** The "Check In" button in the patient registry table (line 505).

---

#### FIX-1E: Queue Page — Fix Interval Cleanup (Memory Leak)
**File:** `app/queue/page.js:41-55`

**What it does:** Polls the queue API every 3 seconds to keep the live monitor updated.

**Before:** `setInterval` has no cleanup function. Every navigation to `/queue` spawns a new interval that runs forever. After 10 navigations, 10 intervals poll simultaneously, wasting bandwidth, server resources, and causing React state-update-on-unmounted warnings.

**After:** Return cleanup: `return () => clearInterval(intervalId);`

**Blocks:** Fixes LEAK-1.

**Dependencies:** None (simple useEffect cleanup addition).

**Relevant UI:** The live public monitor board auto-refreshes every 3 seconds.

---

### Phase 2: Security Fixes (3 fixes)

---

#### FIX-2A: AuthContext — JWT in localStorage (Document/Switch)
**File:** `context/AuthContext.js:59-61`

**What it does:** Stores JWT token and user data in localStorage.

**Before:** `localStorage.setItem('haqms_token', ...)` — any XSS can exfiltrate the token.

**After:** Either:
- Full fix: Switch to httpOnly cookies (requires backend change — sets cookie in auth response)
- Minimum viable: Add warning comment, but for now the app stores token in memory instead of localStorage (still XSS-able but reduces persistence)

**Blocks:** Fixes SEC-1.

**Impact:** High — but note: full fix requires backend changes too (set cookie header in auth.js responses).

---

#### FIX-2B: Dashboard — Role Guard on Delete Button
**File:** `app/dashboard/page.js:511-518`

**What it does:** Shows a delete patient button for all roles.

**Before:** DOCTOR and RECEPTIONIST roles see the delete button. Backend blocks non-ADMIN deletions but UI doesn't show feedback.

**After:** Only render the delete button if `user.role === 'ADMIN'`.

**Blocks:** Fixes SEC-3.

**Relevant UI:** Trash icon in patient registry table (line 511-518).

---

#### FIX-2C: Login — Hide Hardcoded Credentials
**File:** `app/login/page.js:131-153`

**What it does:** Shows demo credentials as clickable buttons.

**Before:** All passwords visible in DOM source (`password123`). Anyone who inspects the page sees credentials.

**After:** Either:
- Remove the credential buttons entirely
- Add a toggle to show/hide them
- Or replace with hidden placeholder text

**Blocks:** Fixes SEC-2.

**Relevant UI:** "Seeded Demo Credentials" section at bottom of login form.

---

### Phase 3: UX & Validation (3 fixes)

---

#### FIX-3A: Dashboard — Loading States on Submit Buttons
**File:** `app/dashboard/page.js:638-643` (register), `722-727` (book)

**What it does:** Registration and booking form submission buttons.

**Before:** No `disabled` state while request is in flight. Double-click creates duplicate patient registrations or duplicate appointment bookings.

**After:** Add `isSubmitting` state, disable button while true, show "Registering..." / "Booking..." text.

**Dependencies:** None.

**Relevant UI:** "Register Patient Record" and "Book Appointment Slot" buttons.

---

#### FIX-3B: Login — Password Validation
**File:** `app/login/page.js:26-38`

**What it does:** Login form submission handler.

**Before:** No client-side password length check. Empty or 1-character passwords get sent to backend.

**After:** Add `if (password.length < 6)` check before calling `login()`.

**Relevant UI:** Login form submit handler.

---

#### FIX-3C: Login — Email Input Type
**File:** `app/login/page.js:81`

**What it does:** Email input field on login page.

**Before:** `type="text"` — disables browser's native email validation and mobile email keyboard.

**After:** Change to `type="email"`.

---

### Phase 4: Performance Fixes (4 fixes)

---

#### FIX-4A: Dashboard — Debounce Patient Search
**File:** `app/dashboard/page.js:99-103`

**What it does:** Fetches patients when search query or gender filter changes.

**Before:** `useEffect` fires `fetchPatients()` on every keystroke. Typing "Alice" triggers 5 API calls in rapid succession.

**After:** Add 300ms debounce using a setTimeout/clearTimeout pattern inside the useEffect.

**Relevant UI:** The patient search input in the Receptionist's Patient Registry tab.

---

#### FIX-4B: Dashboard — Fix Duplicate Doctors Fetch
**File:** `app/dashboard/page.js:106-120`

**What it does:** Populates doctor dropdown for appointment booking.

**Before:** `fetchDoctorsDropdown()` runs on mount AND `searchPhysiciansAdmin()` also populates `doctorsList`. Two sources of truth cause race conditions where booking shows wrong doctor list.

**After:** Single source of truth. Keep `fetchDoctorsDropdown()` for the booking dropdown. The admin search should use a separate state array for search results.

---

#### FIX-4C: Dashboard — Add AbortController to Fetches
**File:** `app/dashboard/page.js` (all ~15 fetch calls)

**What it does:** Every data-fetching function in the dashboard makes a fetch call.

**Before:** No `AbortController` on any fetch. If component unmounts mid-request, React throws state-update-on-unmounted warnings when the response arrives.

**After:** Create an `AbortController` at the top of data fetching functions, pass `signal` in fetch options, and abort in cleanup.

**Implementation approach:**
- Option A: Add AbortController to each individual fetch call (tedious, 15+ changes)
- Option B: Create a custom `useFetch` hook that handles abort and loading state
- Recommended: Option A for consistency since we don't want to over-engineer

---

#### FIX-4D: Queue Page — Fix Stale Closure on refreshCount
**File:** `app/queue/page.js:48`

**What it does:** Logs poll count to console.

**Before:** `console.log(..., refreshCount + 1)` captures the initial value (0) in a closure and never updates. Always shows "Poll #1".

**After:** Either remove the log, or use `setRefreshCount(prev => prev + 1)` return value for the log.

**Dependencies:** This is inside the same `useEffect` as FIX-1D.

---

### Phase 5: API Response Standardization — ✅ Completed

---

#### ✅ FIX-5A: Dashboard — Handle Standardized API Responses
**Status:** Fixed (all 8+ fetch handlers updated)

**File:** `app/dashboard/page.js`

**Before:** Read old flat format (`data.success`, `data.patients`).

**After:** Reads `data.status === 'success'`, `data.data.patients`, `data.data.pagination`.

**Functions fixed:** fetchPatients, fetchDoctorsDropdown, searchPhysiciansAdmin, fetchDoctorWorklist, generateSystemReport, handleQueueCheckin, handleDeletePatient

---

#### ✅ FIX-5B: Queue Page — Handle Standardized API Responses
**Status:** Fixed

**File:** `app/queue/page.js`

**Before:** `setTokens(data)` — assumed response is directly the array.

**After:** `setTokens(data.data.tokens)` — extracts from standardized envelope.

---

### Phase 6: Missing Pages (2 features — Challenge 5 requirement)

---

#### FIX-6A: Create Patient History Records Page
**File:** NEW — `app/patients/[id]/history-records/page.js`

**What it does:** This is the target of the "View Diagnostic Reports Details (Legacy App)" link in the doctor's appointment modal.

**Before:** Link navigates to `/patients/{id}/history-records` which doesn't exist → shows 404 page.

**After:** Create the page to:
1. Fetch patient data + appointment history from the API
2. Display patient info, appointment history, medical history, diagnoses
3. Show a link back to dashboard

**Layout:**
```
┌─────────────────────────────────────────┐
│  ← Back to Dashboard                    │
│                                         │
│  Patient: Bruce Wayne                   │
│  Contact: 555-0199 | Age: 35 | Male     │
│                                         │
│  ─── Medical History ───                │
│  No history recorded                    │
│                                         │
│  ─── Appointment Records ───            │
│  ┌─────────────────────────────────┐    │
│  │ Date    │ Doctor │ Status       │    │
│  ├─────────────────────────────────┤    │
│  │ 2026-05 │ House  │ COMPLETED    │    │
│  │ 2026-04 │ Carter │ PENDING      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─── Queue History ────                 │
│  ...                                    │
└─────────────────────────────────────────┘
```

**API calls needed:**
- `GET /api/patients/{id}` for patient profile + appointments
- Or `GET /api/appointments?patientId={id}` for just appointments

**Dependencies:** Should be done after Phase 0 and 1 (needs `API_BASE_URL` from fixed AuthContext).

---

#### FIX-6B: Create Patient Detail Page
**File:** NEW — `app/patients/[id]/page.js`

**What it does:** A dedicated patient detail/profile page.

**Before:** No dedicated page exists. All patient info only accessible via dashboard modal.

**After:** Create a full patient profile page with:
1. Patient info (name, age, gender, phone, email, medical history)
2. Appointment history list
3. Queue history
4. Quick actions (book appointment, check-in)

**Dependencies:** Same as FEAT-1.

---

### Phase 7: Cleanup (5 fixes)

---

#### FIX-7A: Landing — Remove Unused CalendarDays Import
**File:** `app/page.js:4`

**Before:** `CalendarDays` imported from lucide-react but never used.

**After:** Remove it from the import statement.

---

#### FIX-7B: Landing — Remove 'use client' Directive
**File:** `app/page.js:1`

**Before:** `'use client'` on a static landing page with no interactivity — prevents SSR/SSG.

**After:** Remove the `'use client'` directive.

---

#### FIX-7C: AuthContext — Handle Dead register Function
**File:** `context/AuthContext.js:77-105`

**Before:** `register` function defined and exported but never called by any component.

**After:** Either:
- Remove it entirely (if no registration page is planned)
- Or keep it if planning to build a registration page later

---

#### FIX-7D: Layout — Remove Redundant Font Preconnect
**File:** `app/layout.js:19-21`

**Before:** Google Fonts preconnect links exist alongside `next/font/google` (Inter).

**After:** Remove the manual `<link rel="preconnect">` tags — `next/font/google` handles this automatically.

---

#### FIX-7E: Add Frontend Tests
**File:** NEW — `frontend/src/app/__tests__/` and/or `frontend/src/__tests__/`

**Before:** Zero test coverage for any frontend component.

**After:** Add Vitest + React Testing Library tests for:
1. AuthContext (login, logout, token storage)
2. Login page (form validation, credential display)
3. Dashboard (basic render, tab switching)
4. Navbar (render conditional on auth state)

---

## Complete Fix Order Summary

```
Phase 0 — Foundation
  ├── 0A. AuthContext: Fix hardcoded API URL (URL-1)
  ├── 0B. AuthContext: Add auto-logout on 401 (SEC-4)
  └── 0C. Layout: Add error boundary (UX-4)

Phase 1 — Crash Fixes
  ├── 1A. Dashboard: Add missing Link import (CRASH-2)
  ├── 1B. Dashboard: Guard null medicalHistory (CRASH-1)
  ├── 1C. Dashboard: Guard undefined doctor check-in (DOM-2)
  └── 1D. Queue: Fix interval cleanup / memory leak (LEAK-1)

Phase 2 — Security
  ├── 2A. AuthContext: JWT storage (SEC-1)
  ├── 2B. Dashboard: Role guard on delete (SEC-3)
  └── 2C. Login: Hide hardcoded credentials (SEC-2)

Phase 3 — UX & Validation
  ├── 3A. Dashboard: Loading states on submit (UX-1)
  ├── 3B. Login: Password validation (UX-2)
  └── 3C. Login: Email input type (UX-3)

Phase 4 — Performance
  ├── 4A. Dashboard: Debounce patient search (PERF-1)
  ├── 4B. Dashboard: Fix duplicate doctors fetch (STALE-2)
  ├── 4C. Dashboard: Add AbortController (PERF-2)
  └── 4D. Queue: Fix stale closure (STALE-1)

Phase 5 — API Standardization
  ├── 5A. Dashboard: Handle standardized responses
  └── 5B. Queue: Handle standardized responses

Phase 6 — Missing Pages (Challenge 5)
  ├── 6A. Create patient history-records page (FEAT-1)
  └── 6B. Create patient detail page (FEAT-2)

Phase 7 — Cleanup
  ├── 7A. Landing: Remove unused import (CODE-1)
  ├── 7B. Landing: Remove 'use client' (CODE-2)
  ├── 7C. AuthContext: Handle dead register (CODE-3)
  ├── 7D. Layout: Remove redundant preconnect (CODE-4)
  └── 7E. Add frontend tests (CODE-5)
```

---

## Quick Reference: File → Issues Map

### `context/AuthContext.js` — 4 issues
| ID | Issue | Line | Severity | Phase |
|----|-------|------|----------|-------|
| URL-1 | Hardcoded API URL | 18 | Medium | 0A |
| SEC-4 | No auto-logout on 401 | all fetches | High | 0B |
| SEC-1 | JWT in localStorage | 59-61 | High | 2A |
| CODE-3 | Dead register function | 77-105 | Low | 7C |

### `app/layout.js` — 2 issues
| ID | Issue | Line | Severity | Phase |
|----|-------|------|----------|-------|
| UX-4 | No error boundary | n/a | High | 0C |
| CODE-4 | Redundant font preconnect | 19-21 | Low | 7D |

### `app/login/page.js` — 3 issues
| ID | Issue | Line | Severity | Phase |
|----|-------|------|----------|-------|
| SEC-2 | Hardcoded credentials | 131-153 | High | 2C |
| UX-2 | No password validation | 26-38 | Low | 3B |
| UX-3 | Email type="text" | 81 | Low | 3C |

### `app/dashboard/page.js` — 10 issues
| ID | Issue | Line | Severity | Phase |
|----|-------|------|----------|-------|
| CRASH-2 | Missing Link import | 903 | Critical | 1A |
| CRASH-1 | Null medicalHistory crash | 897 | Critical | 1B |
| DOM-2 | Undefined doctor check-in | 505 | High | 1C |
| SEC-3 | No role guard on delete | 511-518 | Medium | 2B |
| UX-1 | No loading states on submit | 638, 722 | Medium | 3A |
| PERF-1 | No debounce on search | 99-103 | High | 4A |
| STALE-2 | Duplicate doctors fetch | 106-120 | Medium | 4B |
| PERF-2 | Missing AbortController | all fetches | High | 4C |
| API | Handle standardized responses | all fetches | Medium | 5A |
| DOM-1 | DOM getElementById anti-pattern | 776-777 | High | — |

### `app/queue/page.js` — 3 issues
| ID | Issue | Line | Severity | Phase |
|----|-------|------|----------|-------|
| LEAK-1 | No interval cleanup (memory leak) | 41-55 | Critical | 1D |
| STALE-1 | Stale closure refreshCount | 48 | Low | 4D |
| URL-2 | Duplicate hardcoded API URL | 16 | Medium | (0A covers this) |

### `app/page.js` — 2 issues
| ID | Issue | Line | Severity | Phase |
|----|-------|------|----------|-------|
| CODE-1 | Unused CalendarDays import | 4 | Low | 7A |
| CODE-2 | 'use client' on static page | 1 | Low | 7B |

### Missing: `app/patients/[id]/history-records/page.js` — 1 issue
| ID | Issue | Severity | Phase |
|----|-------|----------|-------|
| FEAT-1 | Missing page (404 when clicked) | Critical | 6A |

### Missing: `app/patients/[id]/page.js` — 1 issue
| ID | Issue | Severity | Phase |
|----|-------|----------|-------|
| FEAT-2 | No dedicated patient detail page | Medium | 6B |

---

## Note: DOM-1 Special Case

**DOM-1** (DOM anti-pattern at line 776-777) uses `document.getElementById('walkin-patient').value` and `document.getElementById('walkin-doctor').value` instead of React controlled inputs. This is intentional design in the current app (the walk-in check-in section uses uncontrolled inputs for simplicity). Fixing it would require:
1. Adding `useState` for walkinPatientId and walkinDoctorId
2. Adding `onChange` handlers to the select elements
3. Swapping the onClick handler to use state instead of DOM lookups

This is independent of other fixes and can be done at any time.

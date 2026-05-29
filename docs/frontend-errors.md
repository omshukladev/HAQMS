# Frontend Errors & Issues

All discovered frontend issues organized by the internship evaluation challenges.

---

## Challenge 4: Frontend Memory & React Optimization

### CRASH-1: Null `medicalHistory` Crash
- **Severity:** Critical
- **File:** `frontend/src/app/dashboard/page.js:897`
- **Problem:** `selectedPatientHistory.medicalHistory.toUpperCase()` crashes when `medicalHistory` is null. Seed data includes patients without medical history (Bruce Wayne, Clark Kent, Diana Prince).
- **Fix:** Use optional chaining: `selectedPatientHistory.medicalHistory?.toUpperCase() || 'No history recorded'`
- **Status:** Fixed

### CRASH-2: Missing `Link` Import
- **Severity:** Critical
- **File:** `frontend/src/app/dashboard/page.js:903`
- **Problem:** `<Link href={...}>` used but not imported from `next/link`. Throws `ReferenceError: Link is not defined`.
- **Fix:** Add `import Link from 'next/link'` at top of file
- **Status:** Fixed

### CRASH-3: Null User Crash on Logout Redirect
- **Severity:** Critical
- **File:** `frontend/src/app/dashboard/page.js:17`
- **Problem:** `activeTab` useState uses `user.role` but during the ~2-3 second logout redirect window, `user` is null. Causes `Cannot read properties of null (reading 'role')`.
- **Fix:** Changed to optional chaining `user?.role` and added `if (!user) return null;` guard before JSX
- **Status:** Fixed

### LEAK-1: Queue Polling Memory Leak
- **Severity:** Critical
- **File:** `frontend/src/app/queue/page.js:41-55`
- **Problem:** `setInterval` in `useEffect` has no cleanup function. Each mount spawns a new interval that runs forever. After 10 navigations to /queue, 10 intervals poll the server simultaneously.
- **Fix:** Return cleanup function: `return () => clearInterval(intervalId)`
- **Status:** Fixed

### PERF-1: No Debounce on Patient Search
- **Severity:** High
- **File:** `frontend/src/app/dashboard/page.js:99-103`
- **Problem:** `useEffect` fires `fetchPatients()` on every keystroke with no debounce. Typing "Alice" triggers 5 separate API calls.
- **Fix:** Add 300ms debounce using `setTimeout` + `clearTimeout` or a debounce hook
- **Status:** Fixed

### PERF-2: Missing AbortController on All Fetches
- **Severity:** High
- **File:** `frontend/src/app/dashboard/page.js` (all fetch calls)
- **Problem:** No `AbortController` on any of ~15 fetch calls. If component unmounts mid-request, React throws state-update-on-unmounted warnings.
- **Fix:** Pass `signal: abortController.signal` to each fetch, abort in useEffect cleanup
- **Status:** Fixed

### DOM-1: DOM Anti-Pattern in React
- **Severity:** High
- **File:** `frontend/src/app/dashboard/page.js:776-777`
- **Problem:** Uses `document.getElementById('walkin-patient').value` and `document.getElementById('walkin-doctor').value` instead of React controlled inputs.
- **Fix:** Replace with React state (`useState`) and `onChange` handlers
- **Status:** Pending

### DOM-2: Undefined Doctor Crash Risk
- **Severity:** High
- **File:** `frontend/src/app/dashboard/page.js:505`
- **Problem:** Quick check-in uses `doctorsList[0]?.id` which is `undefined` if `doctorsList` hasn't loaded yet.
- **Fix:** Add guard: disable button until `doctorsList.length > 0`
- **Status:** Fixed

### STALE-1: Stale Closure on refreshCount
- **Severity:** Low
- **File:** `frontend/src/app/queue/page.js:48`
- **Problem:** `refreshCount` captured in stale closure — console log always shows initial value + 1.
- **Fix:** Moved log inside functional state updater to access latest count
- **Status:** Fixed

### STALE-2: Duplicate Doctors Fetch
- **Severity:** Medium
- **File:** `frontend/src/app/dashboard/page.js:106-120`
- **Problem:** `fetchDoctorsDropdown` and `searchPhysiciansAdmin` both populate `doctorsList`. Two sources of truth cause race conditions.
- **Fix:** Created separate `doctorSearchResults` state for search results; `doctorsList` stays as master list
- **Status:** Fixed

---

## Challenge 5: Incomplete Feature Delivery

### FEAT-1: Missing Patient History Records Page
- **Severity:** Critical (required feature)
- **File:** `frontend/src/app/patients/[id]/history-records/page.js`
- **Problem:** Clicking "View Diagnostic Reports Details (Legacy App)" on a patient navigated to 404.
- **Fix:** Created the page to fetch and render patient's profile, appointments, and medical history. Also rebuilt the patient detail modal in the dashboard that was missing.
- **Status:** Fixed

### FEAT-2: Missing Patient Detail Page
- **Severity:** Medium
- **File:** Does not exist — `frontend/src/app/patients/[id]/page.js`
- **Problem:** No dedicated patient detail page exists. All patient info only accessible via dashboard modal.
- **Fix:** Create patient detail page with full profile, appointments list, and queue history
- **Status:** Pending

---

## Security Issues

### SEC-1: JWT Stored in localStorage (XSS Risk)
- **Severity:** High
- **File:** `frontend/src/context/AuthContext.js:59-61`
- **Problem:** Token and user PII stored in `localStorage`. Any injected script can exfiltrate the token.
- **Fix:** Use httpOnly cookies for auth token (requires backend change). At minimum, document this as a known risk.
- **Status:** Pending

### SEC-2: Hardcoded Credentials in Login Page
- **Severity:** High
- **File:** `frontend/src/app/login/page.js:131-153`
- **Problem:** Demo credentials (`admin@haqms.com` / `password123`, etc.) visible in DOM source.
- **Fix:** Hide behind toggle or remove in production build
- **Status:** Pending

### SEC-3: Delete Patient — No Client-Side Role Guard
- **Severity:** Medium
- **File:** `frontend/src/app/dashboard/page.js:511-518`
- **Problem:** Delete button rendered for all roles (DOCTOR, RECEPTIONIST can attempt deletion). Backend enforces ADMIN but no UI feedback for denied requests.
- **Fix:** Only render delete button if `user.role === 'ADMIN'`
- **Status:** Pending

### SEC-4: No Auto-Logout on 401
- **Severity:** High
- **File:** `frontend/src/context/AuthContext.js`
- **Problem:** When JWT expires, API returns 401 but frontend doesn't intercept to redirect to login. User sees broken UI with no clear cause.
- **Fix:** Wrap fetch calls or add global 401 interceptor to clear token and redirect to /login
- **Status:** Fixed

---

## Hardcoded URLs

### URL-1: Hardcoded API URL in AuthContext
- **Severity:** Medium
- **File:** `frontend/src/context/AuthContext.js:18`
- **Problem:** `const API_BASE_URL = 'http://localhost:5000/api'` hardcoded.
- **Fix:** Use `process.env.NEXT_PUBLIC_API_URL`
- **Status:** Fixed

### URL-2: Duplicate Hardcoded URL in Queue Page
- **Severity:** Medium
- **File:** `frontend/src/app/queue/page.js:16`
- **Problem:** Same URL duplicated independently from AuthContext.
- **Fix:** Use `useAuth()` context or `process.env.NEXT_PUBLIC_API_URL`
- **Status:** Fixed

---

## UX & Validation Issues

### UX-1: No Loading/Disabled State on Submit Buttons
- **Severity:** Medium
- **File:** `frontend/src/app/dashboard/page.js:638-643` (register), `722-727` (book)
- **Problem:** Submit buttons have no `disabled` state while request is in flight. Double-click creates duplicate records.
- **Fix:** Add `isSubmitting` state, disable button while true
- **Status:** Fixed

### UX-2: No Password Validation on Login
- **Severity:** Low
- **File:** `frontend/src/app/login/page.js:26-38`
- **Problem:** Password field has no client-side presence/length check. Backend rejects it with delayed error.
- **Fix:** Add `password.length < 6` check with instant error message
- **Status:** Fixed

### UX-3: Email Input Uses `type="text"`
- **Severity:** Low
- **File:** `frontend/src/app/login/page.js:81`
- **Problem:** Email input uses `type="text"` instead of `type="email"`, disabling native validation and mobile email keyboard.
- **Fix:** Change to `type="email"`
- **Status:** Fixed

### UX-4: No Error Boundary
- **Severity:** High
- **File:** `frontend/src/app/layout.js`
- **Problem:** No React error boundary. Any unhandled render error shows white screen.
- **Fix:** Add error boundary component wrapping children
- **Status:** Pending

---

## Code Quality

### CODE-1: Unused Import (`CalendarDays`)
- **Severity:** Low
- **File:** `frontend/src/app/page.js:4`
- **Problem:** `CalendarDays` imported from lucide-react but never used.
- **Fix:** Remove from import
- **Status:** Fixed

### CODE-1b: Unused Imports in Dashboard
- **Severity:** Low
- **File:** `frontend/src/app/dashboard/page.js:7-11`
- **Problem:** `Volume2`, `DollarSign`, `Sparkles` imported from lucide-react but never used in JSX.
- **Fix:** Removed unused icons from import statement
- **Status:** Fixed

### CODE-2: `'use client'` on Static Page
- **Severity:** Low
- **File:** `frontend/src/app/page.js:1`
- **Problem:** Landing page marked `'use client'` but has no interactivity. Prevents SSR.
- **Fix:** Remove `'use client'` directive
- **Status:** Pending

### CODE-3: `register` Function — Dead Code
- **Severity:** Low
- **File:** `frontend/src/context/AuthContext.js:77-105`
- **Problem:** `register` function defined and exported but never called by any component.
- **Fix:** Either use it (build registration page) or remove it
- **Status:** Pending

### CODE-4: Redundant Font Preconnect
- **Severity:** Low
- **File:** `frontend/src/app/layout.js:19-21`
- **Problem:** Google Fonts preconnect links are redundant when using `next/font/google` (Inter).
- **Fix:** Remove preconnect links
- **Status:** Fixed

### CODE-5: No Frontend Tests
- **Severity:** Medium
- **File:** `frontend/` (no test files at all)
- **Problem:** Zero test coverage for any frontend component.
- **Fix:** Add Vitest + React Testing Library for critical components
- **Status:** Pending

---

## Backend Regression (Self-Inflicted)

### REGR-1: Doctor Worklist Broken by Missing `userId` in Doctors API Select
- **Severity:** Critical
- **File:** `backend/src/routes/doctors.js:44-55`
- **Problem:** When adding a `select` clause to `GET /api/doctors` (security hardening to "return only safe fields"), the `userId` field was accidentally omitted. The frontend's `fetchDoctorWorklist` uses `doctorsList.find(d => d.userId === user.id)` to match the logged-in user to their doctor record. Without `userId`, matching always fails silently, and the doctor sees zero appointments/queue tokens.
- **Root Cause:** Security-hardening change did not trace downstream consumers. A `select` that restricts fields is a breaking API change.
- **Fix:** Added `userId: true` back to `select` in both `GET /api/doctors` and `GET /api/doctors/:id`
- **Status:** Fixed
- **Discovered:** 2026-05-29

---

## Summary Count

| Category | Total | Fixed | Pending |
|----------|-------|-------|---------|
| **Critical (crash / leak)** | 5 | 5 | 0 |
| **High** | 8 | 7 | 1 |
| **Medium** | 7 | 5 | 2 |
| **Low** | 8 | 4 | 4 |
| **Total** | **28** | **21** | **7** |

## Remaining Items

1. SEC-1: JWT in localStorage — migrate to httpOnly cookies (requires backend change)
2. UX-4: Error boundary — add React error boundary to layout
3. SEC-2: Hide hardcoded demo credentials behind toggle
4. SEC-3: Client-side role guard on delete button
5. FEAT-2: Patient detail page (separate route)
6. CODE-5: No frontend tests
7. CODE-2: Remove `'use client'` from static landing page

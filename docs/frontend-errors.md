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
- **Status:** Pending

### PERF-2: Missing AbortController on All Fetches
- **Severity:** High
- **File:** `frontend/src/app/dashboard/page.js` (all fetch calls)
- **Problem:** No `AbortController` on any of ~15 fetch calls. If component unmounts mid-request, React throws state-update-on-unmounted warnings.
- **Fix:** Pass `signal: abortController.signal` to each fetch, abort in useEffect cleanup
- **Status:** Pending

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
- **Fix:** Remove the log or use `useRef` for the current count
- **Status:** Pending

### STALE-2: Duplicate Doctors Fetch
- **Severity:** Medium
- **File:** `frontend/src/app/dashboard/page.js:106-120`
- **Problem:** `fetchDoctorsDropdown` and `searchPhysiciansAdmin` both populate `doctorsList`. Two sources of truth cause race conditions.
- **Fix:** Single source of truth for doctors list
- **Status:** Pending

---

## Challenge 5: Incomplete Feature Delivery

### FEAT-1: Missing Patient History Records Page
- **Severity:** Critical (required feature)
- **File:** Does not exist — `frontend/src/app/patients/[id]/history-records/page.js`
- **Problem:** Clicking "View Diagnostic Reports Details (Legacy App)" on a patient navigates to 404. Must build this page.
- **Fix:** Create the page to fetch and render patient's appointments, diagnoses, and medical history
- **Status:** Pending

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
- **Status:** Pending

### UX-2: No Password Validation on Login
- **Severity:** Low
- **File:** `frontend/src/app/login/page.js:26-38`
- **Problem:** Password field has no client-side presence/length check. Backend rejects it with delayed error.
- **Fix:** Add `password.length < 6` check with instant error message
- **Status:** Pending

### UX-3: Email Input Uses `type="text"`
- **Severity:** Low
- **File:** `frontend/src/app/login/page.js:81`
- **Problem:** Email input uses `type="text"` instead of `type="email"`, disabling native validation and mobile email keyboard.
- **Fix:** Change to `type="email"` or keep `type="text"` with proper custom validation
- **Status:** Pending

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
- **Status:** Pending

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
- **Status:** Pending

### CODE-5: No Frontend Tests
- **Severity:** Medium
- **File:** `frontend/` (no test files at all)
- **Problem:** Zero test coverage for any frontend component.
- **Fix:** Add Vitest + React Testing Library for critical components
- **Status:** Pending

---

## Summary Count

| Category | Total | Fixed | Pending |
|----------|-------|-------|---------|
| **Critical (crash / leak)** | 4 | 4 | 0 |
| **High** | 8 | 2 | 6 |
| **Medium** | 7 | 2 | 5 |
| **Low** | 8 | 0 | 8 |
| **Total** | **27** | **8** | **19** |

## Priority Fix Order

1. FEAT-1: Build patient history-records page
2. SEC-1: JWT in localStorage
3. UX-4: Error boundary
4. PERF-1: Debounce patient search
5. DOM-1: Replace DOM anti-pattern with React state
6. UX-1: Loading states on submit buttons
7. PERF-2: AbortController on fetches
8. SEC-2: Hide hardcoded credentials
9. SEC-3: Client-side role guard on delete
10. STALE-2: Deduplicate doctors fetch
11. UX-2: Password validation on login
12. UX-3: Email input type
13. FEAT-2: Patient detail page
14. STALE-1: Stale closure refreshCount
15. CODE-1-5: Cleanup items

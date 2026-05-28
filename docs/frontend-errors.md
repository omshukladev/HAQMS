# Frontend Errors & Issues

All discovered issues across frontend source files.

---

## Critical (crashes / memory leaks)

### 1. Missing `Link` Import

- **File:** `frontend/src/app/dashboard/page.js:903`
- **Problem:** `<Link>` component used but never imported from `next/link`. Clicking "View Diagnostic Reports" throws a runtime error.
- **Impact:** Doctor workflow broken when trying to view patient history.

### 2. Null `medicalHistory` Crash

- **File:** `frontend/src/app/dashboard/page.js:897`
- **Problem:** `selectedPatientHistory.medicalHistory.toUpperCase()` crashes when `medicalHistory` is `null`. Seed data includes patients with `medicalHistory: null` (Bruce Wayne, Clark Kent, Diana Prince).
- **Impact:** Clicking any patient without medical history crashes the entire dashboard render.

### 3. Queue Polling Memory Leak

- **File:** `frontend/src/app/queue/page.js:47-54`
- **Problem:** `setInterval` has no cleanup function. `useEffect` does not return `() => clearInterval(intervalId)`. Each navigation to queue spawns a new interval.
- **Impact:** Accumulating parallel API calls, state updates on unmounted components, browser memory bloat.

---

## High (broken UX / security)

### 4. DOM Anti-Pattern in React

- **File:** `frontend/src/app/dashboard/page.js:776-777`
- **Problem:** Uses `document.getElementById('walkin-patient').value` and `document.getElementById('walkin-doctor').value` instead of React state.
- **Impact:** Breaks React's virtual DOM consistency, harder to test and maintain.

### 5. Undefined Doctor Crash Risk

- **File:** `frontend/src/app/dashboard/page.js:505`
- **Problem:** Quick check-in button uses `doctorsList[0]?.id` which evaluates to `undefined` if `doctorsList` hasn't loaded yet.
- **Impact:** Silent failure / broken check-in flow.

### 6. Missing AbortController on All Fetches

- **File:** `frontend/src/app/dashboard/page.js` (all fetch calls)
- **Problem:** None of the ~15 fetch calls use AbortController. If the component unmounts mid-request, React throws state update warnings.
- **Impact:** Memory leaks, console warnings, potential race conditions.

### 7. Hardcoded API URL in Queue Page

- **File:** `frontend/src/app/queue/page.js:16`
- **Problem:** `const API_BASE_URL = 'http://localhost:5000/api'` hardcoded. Duplicated from AuthContext.
- **Impact:** Breaks on deployment when backend URL differs.

### 8. Hardcoded API URL in AuthContext

- **File:** `frontend/src/context/AuthContext.js:18`
- **Problem:** `const API_BASE_URL = 'http://localhost:5000/api'` hardcoded. Should use `process.env.NEXT_PUBLIC_API_URL`.
- **Impact:** Must be changed before deployment.

### 9. JWT Stored in localStorage

- **File:** `frontend/src/context/AuthContext.js:59-61`
- **Problem:** Token and user data stored in `localStorage`. Vulnerable to XSS attacks.
- **Impact:** Token theft via script injection.

---

## Medium (inconsistent UX / missing features)

### 10. No Loading State on Submit Buttons

- **File:** `frontend/src/app/dashboard/page.js:638-643` (register), `722-727` (book)
- **Problem:** Submit buttons have no `disabled` state while request is in flight. Double-click creates duplicate records.
- **Impact:** Duplicate patient registrations and appointment bookings.

### 11. No Client-Side Password Length Check

- **File:** `frontend/src/app/login/page.js:37`
- **Problem:** Backend requires password >= 6 characters, but frontend submits without checking.
- **Impact:** User gets delayed server error instead of instant feedback.

### 12. Email Input Uses `type="text"`

- **File:** `frontend/src/app/login/page.js:83`
- **Problem:** Email input uses `type="text"` instead of `type="email"`. Disables native validation and mobile keyboard.
- **Impact:** Reduced UX quality.

### 13. No Debounce on Patient Search

- **File:** `frontend/src/app/dashboard/page.js:99-103`
- **Problem:** `useEffect` triggers `fetchPatients` on every keystroke. No debounce or throttle.
- **Impact:** Excessive API calls, unnecessary backend load.

### 14. No Error Boundary

- **File:** `frontend/src/app/layout.js`
- **Problem:** No React error boundary wrapping the app. Any render crash shows white screen.
- **Impact:** Complete UI failure on unhandled render errors.

### 15. No Auto-Logout on 401

- **File:** `frontend/src/context/AuthContext.js`
- **Problem:** When JWT expires, API returns 401 but frontend doesn't intercept to redirect to login.
- **Impact:** Silent failure on expired sessions.

---

## Low (code quality / cleanup)

### 16. Stale Closure on refreshCount

- **File:** `frontend/src/app/queue/page.js:48`
- **Problem:** `setInterval` callback references `refreshCount` but dependency array is `[]`. Count is always 0 inside callback.
- **Impact:** Console log shows incorrect poll count (cosmetic).

### 17. Duplicate Doctors Fetch

- **File:** `frontend/src/app/dashboard/page.js:106-120`
- **Problem:** `fetchDoctorsDropdown` called on mount and also via `searchPhysiciansAdmin`. Two sources of truth for `doctorsList`.
- **Impact:** Race conditions, stale data.

### 18. No Frontend Tests

- **File:** `frontend/` (no test files)
- **Problem:** No test infrastructure (Vitest/Jest config, test files) for any frontend component.
- **Impact:** No regression protection for frontend fixes.

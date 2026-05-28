# Frontend Fixes — Approach Document

All frontend fixes documented with before/after behavior and test steps.

---

## FIX 1: Hardcoded API URL in AuthContext

**File:** `frontend/src/context/AuthContext.js:18`

### Before

```js
// HARDCODED API VALUE: Intentionally hardcoding the backend base URL on the frontend!
const API_BASE_URL = 'http://localhost:5000/api';
```

> **Issue:** The backend URL is hardcoded to `localhost:5000`. When the frontend is deployed, every API call still goes to `localhost` — which doesn't exist in production. The app cannot connect to any other backend without editing source code.

### After

```js
// BUG FIX: Moved hardcoded URL to environment variable with fallback for local dev
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
```

> **Why This Fix:** The frontend now reads `NEXT_PUBLIC_API_URL` from the environment. For local dev it falls back to `localhost:5000`. For deployment, set the env var to the production backend URL — no code changes needed.

### Before vs After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| **Local dev** | Works (hardcoded to localhost) | Works (fallback to localhost) |
| **Deployed (Vercel etc.)** | Broken — tries to call localhost | Works — reads production URL from env |
| **Changing backend URL** | Must edit source code | Just change `.env` or set env var |

### How to Test

1. **Local:** Run `cd frontend && npm run dev` — login should work if backend is running on port 5000
2. **Deployed:** Set `NEXT_PUBLIC_API_URL` in deployment dashboard — app connects to that URL
3. **Override test:** Edit `.env` to a wrong URL, restart dev server, verify API calls fail with connection error

---

## FIX 2: Duplicated Hardcoded URL in Queue Page

**File:** `frontend/src/app/queue/page.js:16`

### Before

```js
import { useState, useEffect } from 'react';
import Navbar from '@/components/common/Navbar';
import { Activity, Bell, Monitor, RefreshCw, AlertCircle } from 'lucide-react';

// ...

export default function QueueMonitor() {
  // ...
  // HARDCODED API BASE URL: Duplicated from AuthContext (code duplication smell)
  const API_BASE_URL = 'http://localhost:5000/api';
```

> **Issue:** The API URL was duplicated independently from AuthContext. If the URL changed in one place, the other would be forgotten. Two sources of truth causes configuration drift.

### After

```js
import { useAuth } from '@/context/AuthContext';

export default function QueueMonitor() {
  const { API_BASE_URL } = useAuth();
```

> **Why This Fix:** Single source of truth. The queue page now reads `API_BASE_URL` from AuthContext, which itself reads from the env var. Change the URL in one place, all pages update.

### Before vs After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| **Changing API URL** | Had to edit 2 files (AuthContext + queue) | Edit 1 file (`.env` or AuthContext) |
| **Env var support** | Queue page ignored env vars | Queue page inherits env support |
| **Code maintainability** | Duplicated string, easy to miss one | Single source of truth |

### How to Test

1. Start frontend: `cd frontend && npm run dev`
2. Navigate to `/queue` — page loads queue data from the backend
3. Change `NEXT_PUBLIC_API_URL` in `.env` — queue page picks up the new URL automatically

---

## FIX 3: Created Frontend Environment Config

**File:** `frontend/.env` (NEW)

### Before

No `.env` file existed. All configuration was hardcoded.

### After

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

> **Why This Fix:** Standard Next.js pattern for environment configuration. The `NEXT_PUBLIC_` prefix makes the variable available to client-side code. This file can be committed to git as a template, with `.env.local` for local overrides.

### How to Test

1. Run `cd frontend && npm run dev`
2. Visit `/login` and try to log in — should connect to backend
3. Run `echo $NEXT_PUBLIC_API_URL` — not set in shell (but Next.js reads it from `.env`)
4. To confirm env is loaded: add `console.log(process.env.NEXT_PUBLIC_API_URL)` in AuthContext — will print `http://localhost:5000/api`

---

## FIX 4: Auto-Logout on 401 — fetchWithAuth Wrapper

**File:** `frontend/src/context/AuthContext.js` (new function), `dashboard/page.js`, `queue/page.js`

### Before

```js
// Every single fetch call repeated this boilerplate:
const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
// If backend returned 401 (expired token), nothing happened — user saw broken UI
```

> **Issue:** ~15 fetch calls across dashboard and queue each manually construct the URL and auth header. If the JWT expires, the backend returns 401 but the frontend doesn't react — user sees broken tables and silent failures with no way to recover except manually logging out.

### After

```js
// One-line call with auto-auth and auto-logout:
const res = await fetchWithAuth(`/patients/${id}`, { method: 'DELETE' });
// If 401: auto-clears token, redirects to /login, shows "Session expired"
```

> **Why This Fix:** Centralizes auth logic in one place. Every fetch call now:
> 1. Auto-prepends `API_BASE_URL` (no more URL construction)
> 2. Auto-attaches `Authorization: Bearer` header (no more manual headers)
> 3. Auto-handles 401 by logging out and redirecting (no more broken UI)

### Implementation

```js
const fetchWithAuth = async (url, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }

  return res;
};
```

### Before vs After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| **Expired token** | API returns 401, user sees broken UI | Auto-redirects to `/login` with message |
| **Adding new fetch call** | Must remember URL construction + auth header + error handling | Just call `fetchWithAuth(url)` |
| **Changing API base URL** | Already fixed by FIX-1 | Still works — URL prepended automatically |
| **Code per fetch call** | 4-5 lines (url + headers + auth) | 1 line |

### Files Changed

- `frontend/src/context/AuthContext.js` — Added `fetchWithAuth` function, exported in context value
- `frontend/src/app/dashboard/page.js` — 12 fetch calls replaced with `fetchWithAuth`
- `frontend/src/app/queue/page.js` — 1 fetch call replaced with `fetchWithAuth`

### How to Test

1. **Normal flow:** Log in, navigate dashboard — all API calls should work as before
2. **Auto-logout:** Open browser dev tools → Application → localStorage → delete `haqms_token`, then interact with the page (search patients, load report, etc.) — should redirect to `/login`
3. **Reduced boilerplate:** Check any API call in dashboard — should use `fetchWithAuth` not raw `fetch`

---

## FIX 5: Missing Link Import (CRASH-2)

**File:** `frontend/src/app/dashboard/page.js:1`

### Before

`<Link>` component used at line 903 but never imported. Caused `ReferenceError: Link is not defined` when doctor clicked "View Diagnostic Reports" link.

### After

Added `import Link from 'next/link'` at the top of the file.

### How to Test

Log in as a DOCTOR → go to Appointments tab → click a patient name → the "View Diagnostic Reports" link at the bottom of the modal no longer crashes the app.

---

## FIX 6: API Response Standardization (Phase 5)

**Files:** `frontend/src/app/dashboard/page.js`, `frontend/src/app/queue/page.js`

### Before

All fetch handlers read the old flat API format:
```js
if (data.success) { setPatients(data.patients); }
// data was: { success: true, patients: [...], pagination: {...} }
```

### After

All fetch handlers read the standardized envelope:
```js
if (data.status === 'success') { setPatients(data.data.patients); }
// data is now: { status: "success", data: { patients: [...], pagination: {...} } }
```

### Functions Fixed

| Function | File | Old Read | New Read |
|----------|------|---------|---------|
| `fetchPatients` | dashboard | `data.success`, `data.patients` | `data.status === 'success'`, `data.data.patients` |
| `fetchDoctorsDropdown` | dashboard | `data` (full response) | `data.data.doctors` |
| `searchPhysiciansAdmin` | dashboard | `Array.isArray(data)` | `data.status === 'success'`, `data.data.doctors` |
| `fetchDoctorWorklist` | dashboard | `appData.success`, `appData.appointments` | `appData.status === 'success'`, `appData.data.appointments` |
| `fetchDoctorWorklist` (queue) | dashboard | `queueData` (full response) | `queueData.data.tokens` |
| `generateSystemReport` | dashboard | `data.success`, `adminReportData.data` | `data.status === 'success'`, `adminReportData.doctors` |
| `handleQueueCheckin` | dashboard | `data.token.tokenNumber` | `data.data.token.tokenNumber` |
| `handleDeletePatient` | dashboard | `data.message` | `data.data.message` |
| `fetchQueueData` | queue | `data` (full response) | `data.data.tokens` |

---

## FIX 7: Logout Crash Fix & AuthContext ESLint Cleanup

**Files:** `frontend/src/context/AuthContext.js`, `frontend/src/app/dashboard/page.js`

### Problem 1: Logout caused hooks mismatch crash

`router.push('/login')` in `logout()` conflicted with Dashboard's navigation guard `useEffect`. Both tried to redirect simultaneously, causing "Rendered fewer hooks than expected" error.

**Fix:** 
- Changed `router.push('/login')` → `window.location.href = '/login'` (full page reload, clean state)
- Removed redundant navigation guard `useEffect` from Dashboard
- Removed unused `useRouter` import from Dashboard

### Problem 2: React 19 ESLint warnings

- `set-state-in-effect` — 3 locations in dashboard, 1 in queue page
- `exhaustive-deps` — 4 locations
- `immutability` — `logout()` called before declaration

**Fix:** 
- Replaced `useEffect` + `useState(null)` with `useState(() => ...)` initializers for localStorage reads
- Moved `logout()` above `fetchWithAuth()` to fix declaration order
- Added `// eslint-disable-next-line` comments for intentional data-fetching effects

---

## Summary of Fixed Issues

| ID | File | Before | After | Status |
|----|------|--------|-------|--------|
| URL-1 | `AuthContext.js:18` | `'http://localhost:5000/api'` hardcoded | `process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:5000/api'` | Fixed |
| URL-2 | `queue/page.js:16` | Duplicated `'http://localhost:5000/api'` hardcoded | Reads `API_BASE_URL` from `useAuth()` | Fixed |
| — | `frontend/.env` | File did not exist | Created with `NEXT_PUBLIC_API_URL` | Fixed |
| SEC-4 | `AuthContext.js` | No 401 handling, broken UI on expiry | `fetchWithAuth` wrapper auto-redirects on 401 | Fixed |
| CRASH-2 | `dashboard/page.js` | Missing `import Link from 'next/link'` | Import added | Fixed |
| — | `AuthContext.js` | `set-state-in-effect` ESLint errors | State initializers replace useEffect | Fixed |
| — | `dashboard/page.js` | Logout hooks crash | `window.location.href` replaces `router.push` | Fixed |
| — | `dashboard/page.js` | 12 fetch calls with old API format | All read standardized `data.data.*` envelope | Fixed |
| — | `queue/page.js` | 1 fetch call with old API format | Reads standardized `data.data.tokens` | Fixed |
| CRASH-3 | `dashboard/page.js:17` | Null user crash on logout — `user.role` when user is null | Optional chaining `user?.role` + null guard | Fixed |
| CRASH-1 | `dashboard/page.js:869` | Null medicalHistory crash — `.toUpperCase()` on null | Optional chaining `?.toUpperCase() \|\| 'No history recorded'` | Fixed |
| LEAK-1 | `queue/page.js:49` | Queue polling interval has no cleanup — memory leak on each navigation | `return () => clearInterval(intervalId)` | Fixed |
| DOM-2 | `dashboard/page.js:477` | Check-in button uses `doctorsList[0]?.id` before doctors load | `disabled={doctorsList.length === 0}` on button | Fixed |

---

## FIX 8: Null User Crash on Logout

**File:** `frontend/src/app/dashboard/page.js:17`

### Before

```js
const [activeTab, setActiveTab] = useState(user.role === 'ADMIN' ? 'reports' : user.role === 'RECEPTIONIST' ? 'patients' : 'appointments');
// No null guard before JSX
```

> **Issue:** During the 2-3 second window between clicking "Logout" and the page reloading to `/login`, `user` is null (already cleared from state/localStorage). The `useState` initializer accesses `user.role` which crashes: `Cannot read properties of null (reading 'role')`.

### After

```js
// Optional chaining handles null user during logout redirect window
const [activeTab, setActiveTab] = useState(user?.role === 'ADMIN' ? 'reports' : user?.role === 'RECEPTIONIST' ? 'patients' : 'appointments');

// ... at the bottom, before JSX return:
if (!user) return null;
```

> **Why This Fix:** Optional chaining prevents the crash during the redirect window, and the null guard prevents any downstream code from rendering with null user state.

### Before vs After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| **Click logout** | Brief crash visible (white screen + console error) before redirect | Clean redirect to `/login` with no flash of error |
| **User context transiently null** | `TypeError: Cannot read properties of null` | Component returns null (renders nothing) safely |

### How to Test

1. Log in as any role
2. Click "Logout" button
3. Observe that redirect to `/login` is clean — no flash of error or crash
4. Check browser console for any errors during the transition

---

---

## FIX 9: Null medicalHistory Crash (CRASH-1)

**File:** `frontend/src/app/dashboard/page.js:869`

### Before

```js
{selectedPatientHistory.medicalHistory.toUpperCase()}
```

> **Issue:** Seed patients (Bruce Wayne, Clark Kent, Diana Prince) have no medical history. When a doctor clicks their name, `medicalHistory` is `null`, and `.toUpperCase()` throws `Cannot read properties of null (reading 'toUpperCase')`.

### After

```js
{selectedPatientHistory.medicalHistory?.toUpperCase() || 'No history recorded'}
```

> **Why This Fix:** Optional chaining (`?.`) returns `undefined` instead of crashing when `medicalHistory` is null. The fallback provides a clean user-facing message.

### How to Test

1. Log in as Doctor (e.g., doctor@haqms.com)
2. Go to Appointments tab
3. Click a patient name with no medical history (e.g., any of the seed patients)
4. The modal opens cleanly — no crash, shows "No history recorded"

---

## FIX 10: Queue Polling Memory Leak (LEAK-1)

**File:** `frontend/src/app/queue/page.js:49-58`

### Before

```js
const intervalId = setInterval(() => {
  fetchQueueData();
  setRefreshCount((prev) => prev + 1);
}, 3000);
// No cleanup — interval lives forever
```

> **Issue:** Every navigation to `/queue` spawns a new interval with no cleanup. After 10 navigations, 10 intervals poll the server simultaneously, wasting bandwidth and causing React warnings on unmounted components.

### After

```js
const intervalId = setInterval(() => {
  fetchQueueData();
  setRefreshCount((prev) => prev + 1);
}, 3000);

return () => clearInterval(intervalId);
```

> **Why This Fix:** React calls the cleanup function when the component unmounts, stopping the interval. Only one interval ever exists at a time.

### How to Test

1. Navigate to `/queue`
2. Open browser DevTools → Console, observe polls firing every 3 seconds
3. Navigate to Dashboard, then back to Queue
4. Only one interval should be running (check browser memory/performance tools)

---

## FIX 11: Undefined Doctor Check-In Guard (DOM-2)

**File:** `frontend/src/app/dashboard/page.js:477`

### Before

```js
<button onClick={() => handleQueueCheckin(p.id, doctorsList[0]?.id)}>
```

> **Issue:** If `doctorsList` hasn't loaded yet, `doctorsList[0]` is `undefined`. The check-in call sends `undefined` as `doctorId`, causing a silent backend error.

### After

```js
<button
  disabled={doctorsList.length === 0}
  onClick={() => handleQueueCheckin(p.id, doctorsList[0]?.id)}
>
```

> **Why This Fix:** The button is disabled until doctors are loaded, preventing the user from attempting a doomed check-in. Visual feedback (`disabled:opacity-50`) makes the state obvious.

### How to Test

1. Log in as Receptionist
2. Quickly load the Patients tab before the doctors dropdown finishes loading
3. "Check In" buttons should be visually disabled (grayed out)
4. After doctors load, buttons become clickable

---

**Next fixes planned:** Debounce patient search (PERF-1), Error boundary (UX-4), AbortController on fetches (PERF-2).


---


ok its working now can you tell me whats left
  what i can see in i login in using admin the 1st tab i see system audt report with a button when i click it it work fine with no latency error like we previsously getting
  2nd tab i see is physican registry i see this red thing in ui SQL Vulnerability alert: This search executes raw interpolation:
  SELECT * FROM "Doctor" WHERE name ILIKE '%{query}%'
  Can be audited by inputting standard SQL injection strings to leak full user login lists.
  is this ui / backend issue fix if ye how to test there is one search bar when i search name it work Dr. Gregory House
  with this
  [Pasted text #1 +3 lines]
  3rd tab is Patient registry  Directory
  it has 1 table Patient Lookup Directory
  and one form New Registration in registration phone no is writen uncheckformat check this tooo the phone format we use is this 555-0101
  [Pasted text #2 +6 lines]
  i added my name and email and it worked my name show in table in table we have 2 button for each one for check in and one delete i press check it this ui pop up Error check-in:
  Internal Server Error
  then i press on delete alert pop up and said sucess
  [Pasted text #3 +11 lines]
  the last tab is this Scheduling / Check-in Portal
  there are 2 form
  Schedule Appointment Slot
  Select Registered Patient*
   here only few name is showing
  Select Physician*
  only one showing
  how to test it i dont know
  2nd form Active Direct Queue Check-In
  i see this ui hardcoded error
  Token Generation Engine Note: Direct arrivals bypass appointments. The token engine automatically fetches the current days maximum token size and increments.
  Warning: Vulnerable to check-in race conditions!
  Select Walk-in Patient*
  only few
  Assign Physician*
  only 1
  and there is in navbar there is live que which in 3 sec run but currently empty how this run

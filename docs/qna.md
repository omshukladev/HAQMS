# Interview Q&A — HAQMS Frontend Engineering Decisions

Common interview questions and answers based on the actual technical decisions made in this project.

---

## Authentication & Security

### Q: Why is the JWT stored in localStorage instead of cookies?

**A:** This app stores the JWT in `localStorage` for simplicity — it's a common pattern in Next.js SPA-style apps because it's easy to implement on the frontend alone. The token is stored under the key `haqms_token` and attached to every API request via an `Authorization: Bearer` header.

**The tradeoff:**
- `localStorage` is accessible to any JavaScript running on the page. If an XSS vulnerability exists, an attacker can read `localStorage.getItem('haqms_token')` and steal the session.
- `httpOnly` cookies are more secure because JavaScript can't read them at all — they're sent automatically by the browser. But this requires the backend to set the cookie in the response, and you need CSRF protection.

**For this project:** localStorage is acceptable for a demo. In production, I'd use httpOnly cookies or a token refresh pattern.

### Q: What's the difference between localStorage, sessionStorage, and cookies for auth tokens?

| Feature | localStorage | sessionStorage | Cookies (httpOnly) |
|---------|-------------|----------------|-------------------|
| Persists after tab close | Yes | No | Yes (if expiry set) |
| Accessible to JS | Yes | Yes | No |
| Sent automatically | No | No | Yes |
| Max size | ~5-10 MB | ~5-10 MB | ~4 KB |
| CSRF protection needed | No | No | Yes |
| XSS immune | No | No | Yes |
| Requires backend change | No | No | Yes |

### Q: How does the `fetchWithAuth` wrapper work?

It's a centralized fetch function that:
1. Prepends `API_BASE_URL` to every request — no need to repeat the domain
2. Auto-attaches the `Authorization: Bearer` header from localStorage
3. Intercepts 401 responses and auto-logs out the user with a redirect to `/login`

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
    logout();  // clears token, redirects to /login
    throw new Error('Session expired.');
  }
  return res;
};
```

### Q: Why did the logout crash with "Rendered fewer hooks"?

The original code used `router.push('/login')` inside `logout()`. This conflicted with a separate `useEffect` in the Dashboard that also called `router.push` on navigation. React 19 couldn't handle two simultaneous navigation calls, causing a hooks mismatch error.

**The fix:** Changed to `window.location.href = '/login'` (full page reload). This gives React a clean unmount and avoids the conflict. The redundant navigation guard `useEffect` was removed from the Dashboard.

### Q: Why use `window.location.href` instead of `router.push` for logout?

`router.push` is a client-side navigation — React stays mounted and re-renders the new page. During this process, stale state can cause crashes. `window.location.href` triggers a full page reload, giving a completely clean React tree. For logout, this is actually desirable — you want to clear all in-memory state.

---

## React 19 & ESLint

### Q: What is React 19's `set-state-in-effect` rule?

New in React 19, this ESLint rule warns when you call a state setter synchronously inside a `useEffect`. The concern is performance — cascading renders. The React docs suggest that if you're calling `setState` in an effect, you might not need the effect at all.

**How we fixed it:** Replaced `useEffect` + `useState(null)` with `useState(() => ...)` initializer functions for reading from localStorage. This moved the work out of the effect and into the lazy initializer, which runs synchronously during the first render.

```js
// BEFORE — triggers set-state-in-effect warning
const [user, setUser] = useState(null);
useEffect(() => {
  const stored = localStorage.getItem('haqms_user');
  if (stored) setUser(JSON.parse(stored));
}, []);

// AFTER — no warning, runs once during initialization
const [user, setUser] = useState(() => {
  const stored = localStorage.getItem('haqms_user');
  return stored ? JSON.parse(stored) : null;
});
```

### Q: Why do some `useEffect` calls still have eslint-disable comments?

Data-fetching effects (like `fetchPatients()` on search input change) intentionally call state setters inside the effect. The alternative would be to use a library like React Query or SWR, but that would add unnecessary dependencies. The comments document that these are intentional:

```js
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  fetchPatients(1);
}, [patientSearch, patientGender]);
```

---

## Architecture & Design

### Q: Why use environment variables for the API URL?

Hardcoding `http://localhost:5000/api` meant the app could only connect to one backend. By using `process.env.NEXT_PUBLIC_API_URL` with a localhost fallback, the same code works in development and production — just set the env var in the deployment dashboard.

```js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
```

The `NEXT_PUBLIC_` prefix is required by Next.js to expose the variable to client-side code.

### Q: What was wrong with having the API URL duplicated in two files?

Two sources of truth cause configuration drift. If the URL changed in AuthContext but the queue page was forgotten, one part of the app would break silently. The fix was to read the URL from AuthContext everywhere via the context provider — single source of truth.

### Q: Why standardize API response format?

The backend was returning inconsistent shapes: some endpoints returned `{ success: true, patients: [...] }`, others returned `{ status: "success", data: { patients: [...] } }`. The frontend had to handle both formats, causing bugs when a format changed. Standardizing to `{ status: "success", data: { ... } }` across the entire API made the frontend parsing predictable.

### Q: What is the "null guard" pattern and why is it needed?

After the `logout()` function clears user state and triggers a redirect, there's a ~2-3 second window where the Dashboard component re-renders with `user = null` before the page reload completes. Without a guard, accessing `user.role` crashes.

```js
// Optional chaining prevents crash in useState initializer
const [activeTab, setActiveTab] = useState(
  user?.role === 'ADMIN' ? 'reports' : user?.role === 'RECEPTIONIST' ? 'patients' : 'appointments'
);

// Null guard prevents rendering with null user during logout
if (!user) return null;
```

---

## Performance & Best Practices

### Q: What React performance issues remain in this app?

Known unfixed issues:
- **LEAK-1**: Queue polling `setInterval` has no cleanup — navigating away from `/queue` still fires the interval
- **PERF-1**: Patient search fires an API call on every keystroke with no debounce
- **PERF-2**: No `AbortController` on fetch calls — unmounted components can trigger state update warnings
- **DOM-1**: Uses `document.getElementById` instead of React controlled inputs for walk-in check-in

### Q: Why not add a debounce to the patient search?

It's a known issue (PERF-1) and would be a quick fix using a `setTimeout`/`clearTimeout` pattern inside the search effect. The priority was lower than crash fixes and security issues.

### Q: What testing strategy would you recommend for this app?

- **Unit tests**: Vitest + React Testing Library for critical components (login form, fetchWithAuth, AuthContext)
- **Integration tests**: Test the full login → dashboard → queue flow with a mocked API
- **E2E**: Playwright or Cypress for critical user journeys

Currently the app has zero frontend tests (documented as CODE-5).

---

## Summary of Frontend Fixes

| Issue | What | Why |
|-------|------|-----|
| URL-1 | Env var for API URL | Deployable to any backend |
| URL-2 | Removed duplicated URL | Single source of truth |
| SEC-4 | fetchWithAuth wrapper | Auto-401 handling |
| CRASH-2 | Added Link import | Missing import crash |
| CRASH-3 | Null user guard | Logout crash fix |
| API Fmt | 9 fetch handlers updated | Standardized API format |
| Logout | window.location.replace | Hooks mismatch crash |
| ESLint | State initializers + comment placement | React 19 rules |

---

## Common Follow-Up Questions

**Q: If you had more time, what would you improve?**

1. Move auth to httpOnly cookies (backend + frontend)
2. Add React Query or SWR for data fetching (caching, deduplication, refetching)
3. Add debounce to search inputs
4. Fix the queue polling memory leak
5. Add proper loading states on submit buttons
6. Build the missing patient history records page
7. Add frontend tests

**Q: What's the biggest security risk remaining?**

SEC-1: JWT in localStorage. An XSS vulnerability would expose all user tokens. The fix requires backend changes to set httpOnly cookies.

**Q: What deployment considerations are there?**

Set `NEXT_PUBLIC_API_URL` in the Vercel/Netlify dashboard to point to the production backend. The `.env` file is for local development only. Also ensure the backend CORS origin is configured to match the frontend deployment URL.

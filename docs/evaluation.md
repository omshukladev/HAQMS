🎯 Internship Evaluation Tasks
As an internship candidate, your evaluation is divided into five core objectives:

🔍 Challenge 1: Security Audit
Identify and patch several production-level security bugs:

Credential Logging: Find where raw user passwords are logged in plain text.
Leaky Token Signature: Audit how JWTs are signed, stored, and verified.
SQL Injection: Locate the search input vulnerable to SQL injection and rewrite it using parameterized queries.
Bypassed Authorization: Find the admin action endpoint that fails to enforce actual role authorizations.
⚡ Challenge 2: Backend Performance & Concurrency
Analyze and optimize backend logic:

N+1 Database Queries: Identify the endpoint fetching core list elements but executing separate queries per row in a loop.
Event-Loop Blocking: Locate sequential async database queries where parallel triggers should be utilized.
Slow aggregation endpoint: Fix the slow nested report endpoint that locks the event loop.
Check-in Token Race Condition: Find why concurrent direct check-ins assign duplicate token numbers and patch it using transaction locks or auto-increment sequences.
💾 Challenge 3: Database & Schema Optimization
Refactor DB layers:

Schema Vulnerabilities: Locate the missing constraints that permit double-booking the same physician at the exact same millisecond slot.
Missing Indices: Add appropriate indices to speed up foreign key relationships and status filters under load.
Paging Optimization: Fix the listing route that performs in-memory pagination slicing instead of SQL pagination.
🖥️ Challenge 4: Frontend Memory & React Optimization
Examine frontend React components:

Severe Memory Leak: Navigate to the Live Public Queue Board (/queue). Mount and unmount it repeatedly. Find the leak in src/app/queue/page.js and patch it.
Unnecessary Re-renders: Optimize search input fields that trigger complete list re-renders on every single keystroke.
NULL Value Application Crash: Log in as a Doctor (doctor1@haqms.com), click on one of the patients with a blank medical history (e.g., Clark Kent or Bruce Wayne), and diagnose why the entire React app crashes on rendering.
🏗️ Challenge 5: Incomplete Feature Delivery
Resolve styled 404 error: Clicking "View Diagnostic Reports Details (Legacy App)" on a patient profile triggers a 404 page. Your final task is to build out that missing page (src/app/patients/[id]/history-records/page.js) to fetch and render the patient clinical record.
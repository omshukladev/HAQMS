# Problems Table

## Total Problems

14

## Summary

| No. | Problem | Where | Rating |
| --- | --- | --- | --- |
| 1 | JWT verification ignores expiration | `backend/src/middleware/auth.js` | Hard |
| 2 | Sensitive credentials are logged and leaked | `backend/src/routes/auth.js` | Easy |
| 3 | Doctor search is vulnerable to SQL injection | `backend/src/routes/doctors.js` | Medium |
| 4 | Admin delete authorization is bypassed | `backend/src/middleware/auth.js`, `backend/src/routes/patients.js` | Easy |
| 5 | Queue token generation can duplicate numbers | `backend/src/routes/queue.js`, `backend/prisma/schema.prisma` | Hard |
| 6 | Appointments route performs N+1 queries | `backend/src/routes/appointments.js` | Medium |
| 7 | Doctor stats and reports are sequential and slow | `backend/src/routes/doctors.js`, `backend/src/routes/reports.js` | Medium |
| 8 | Patient list paginates in memory | `backend/src/routes/patients.js` | Medium |
| 9 | Doctor and appointment schema lacks key constraints and indexes | `backend/prisma/schema.prisma` | Medium |
| 10 | Queue page leaks polling intervals | `frontend/src/app/queue/page.js` | Easy |
| 11 | Doctor dashboard crashes on null medical history | `frontend/src/app/dashboard/page.js` | Easy |
| 12 | Missing patient history detail route | `frontend/src/app/patients/[id]/history-records/page.js` | Medium |
| 13 | Link component used without import in Dashboard | `frontend/src/app/dashboard/page.js` | Easy |
| 14 | Registration endpoint returns password hash in response | `backend/src/routes/auth.js` | Easy |

## Notes

- **Easy** means a small, direct fix.
- **Medium** means a moderate change with some related wiring.
- **Hard** means the issue needs careful handling, often with security or concurrency impact.
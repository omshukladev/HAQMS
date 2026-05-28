# Problems Table

## Total Problems

14

## Summary

| No. | Problem | Where | Rating | Status |
| --- | --- | --- | --- | --- |
| 1 | JWT verification ignores expiration | `backend/src/middleware/auth.js` | Hard | Pending |
| 2 | Sensitive credentials are logged and leaked | `backend/src/routes/auth.js` | Easy | ✅ **FIXED** |
| 3 | Doctor search is vulnerable to SQL injection | `backend/src/routes/doctors.js` | Medium | Pending |
| 4 | Admin delete authorization is bypassed | `backend/src/middleware/auth.js`, `backend/src/routes/patients.js` | Easy | Pending |
| 5 | Queue token generation can duplicate numbers | `backend/src/routes/queue.js`, `backend/prisma/schema.prisma` | Hard | Pending |
| 6 | Appointments route performs N+1 queries | `backend/src/routes/appointments.js` | Medium | Pending |
| 7 | Doctor stats and reports are sequential and slow | `backend/src/routes/doctors.js`, `backend/src/routes/reports.js` | Medium | Pending |
| 8 | Patient list paginates in memory | `backend/src/routes/patients.js` | Medium | Pending |
| 9 | Doctor and appointment schema lacks key constraints and indexes | `backend/prisma/schema.prisma` | Medium | Pending |
| 10 | Queue page leaks polling intervals | `frontend/src/app/queue/page.js` | Easy | Pending |
| 11 | Doctor dashboard crashes on null medical history | `frontend/src/app/dashboard/page.js` | Easy | Pending |
| 12 | Missing patient history detail route | `frontend/src/app/patients/[id]/history-records/page.js` | Medium | Pending |
| 13 | Link component used without import in Dashboard | `frontend/src/app/dashboard/page.js` | Easy | Pending |
| 14 | Registration endpoint returns password hash in response | `backend/src/routes/auth.js` | Easy | ✅ **FIXED** |

## Notes

- **Easy** means a small, direct fix.
- **Medium** means a moderate change with some related wiring.
- **Hard** means the issue needs careful handling, often with security or concurrency impact.
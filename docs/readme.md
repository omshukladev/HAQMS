# HAQMS — Hospital Appointment & Queue Management System

Deliberately imperfect hospital management application for engineering candidate evaluation.

## Project Structure

```
HAQMS/
├── backend/                # Express + Prisma API server
│   ├── prisma/             # Schema, migrations, seed
│   ├── src/
│   │   ├── index.js        # Express app entry point
│   │   ├── middleware/      # Auth middleware (JWT)
│   │   └── routes/          # API route handlers
│   └── package.json
├── frontend/               # Next.js 16 App Router
│   └── src/
│       ├── app/            # Pages (dashboard, login, queue)
│       ├── components/     # Shared components
│       └── context/        # Auth context
├── docker-compose.yml      # PostgreSQL container
├── setup.sh                # Setup orchestrator
└── docs/                   # Documentation
```

## Setup Instructions

### Prerequisites

- Node.js v18+
- PostgreSQL (or Docker)
- npm

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd HAQMS
npm run install:all
```

### 2. Start PostgreSQL

Using Docker (recommended):
```bash
npm run docker:db
```

Or use a local PostgreSQL instance.

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` if your database credentials differ from defaults.

### 4. Run migrations and seed

```bash
npm run db:setup
```

### 5. Start development servers

```bash
npm run dev
```

This starts both servers via concurrently:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

### Seeded Credentials

All accounts use password: `password123`

| Role | Email |
|------|-------|
| ADMIN | admin@haqms.com |
| RECEPTIONIST | reception1@haqms.com |
| DOCTOR | doctor1@haqms.com (Dr. Gregory House) |
| DOCTOR | doctor2@haqms.com (Dr. Meredith Grey) |
| DOCTOR | doctor3@haqms.com (Dr. John Carter) |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login, returns JWT |
| GET | /api/auth/me | Yes | Current user profile |
| GET | /api/patients | Yes | List patients |
| GET | /api/patients/:id | Yes | Get patient |
| POST | /api/patients | Yes | Create patient |
| DELETE | /api/patients/:id | Yes | Delete patient |
| GET | /api/doctors | Yes | List doctors |
| GET | /api/doctors/stats | Yes | Doctor stats |
| GET | /api/doctors/:id | Yes | Get doctor |
| GET | /api/appointments | Yes | List appointments |
| POST | /api/appointments | Yes | Book appointment |
| PATCH | /api/appointments/:id | Yes | Update appointment |
| GET | /api/queue | Yes | List queue tokens |
| POST | /api/queue/checkin | Yes | Generate queue token |
| PATCH | /api/queue/:id | Yes | Update token status |
| GET | /api/reports/doctor-stats | Yes | Doctor report |

## Architecture

### Backend (Express + Prisma + PostgreSQL)

- Middleware chain: CORS → JSON parser → Logger → Routes → Error handler
- Authentication: JWT Bearer token with role-based authorization
- Database: Prisma ORM with PostgreSQL (4 models, 3 enums)

### Frontend (Next.js 16 App Router)

- Pages: Home, Login, Dashboard, Live Queue Monitor, 404
- Auth state managed via React Context + localStorage
- Direct fetch calls (no API client abstraction)
- Tailwind CSS v4 for styling with glassmorphism design

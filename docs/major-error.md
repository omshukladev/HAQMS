# Major Errors Log

Tracks blocking issues, debugging incidents, and their resolutions.

---

## 2026-05-28 — CI Local Test Runner: Port 5432 Conflict

### Full Error

```
failed to start container: Error response from daemon: failed to set up container networking:
driver failed programming external connectivity on endpoint act-...-test-network:
Bind for 0.0.0.0:5432 failed: port is already allocated
```

### Reproduction Steps

1. Run `docker-compose up -d` to start local PostgreSQL
2. Run `act --job test` to execute CI pipeline locally
3. `act` tries to start its own PostgreSQL container on port 5432
4. Port is already bound by the local `haqms-postgres` container → crash

### Investigation

- `docker ps` confirmed `haqms-postgres` was running on 5432
- `act` creates a PostgreSQL service container as defined in `ci.yml` which also binds to 5432
- Docker cannot share port 5432 between two containers

### Resolution

Stopped the local PostgreSQL container before running `act`:

```bash
docker stop haqms-postgres
act --job test
```

After CI testing, restart the local database:

```bash
docker start haqms-postgres
```

### Alternative Solutions Considered

- Changing CI port mapping to 5433 — rejected because it would make the CI config non-standard for actual GitHub Actions runs
- Stopping the container is simpler and more correct

---

## 2026-05-28 — CI Pipeline: Prisma 7 Pulled Instead of Local Prisma 5

### Full Error

```
Run npx prisma generate
  npx prisma generate
  shell: /bin/bash -e {0}
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/haqms_test?schema=public
    JWT_SECRET: ci-test-secret
    JWT_EXPIRY: 7h
    NODE_ENV: test

npm warn exec The following package was not found and will be installed: prisma@7.8.0

Prisma schema loaded from prisma/schema.prisma.

Error: The datasource property `url` is no longer supported in schema files.
```

### Reproduction Steps

1. Push CI config using `npx prisma generate` and `npx prisma migrate deploy` with `working-directory: backend`
2. CI runs `npm install` at root, which only installs root `devDependencies`
3. `backend/node_modules` does not contain Prisma 5
4. `npx prisma` cannot find local Prisma, downloads Prisma 7 as fallback
5. Prisma 7 has breaking changes: `url` property in datasource is no longer supported

### Investigation

- Confirmed `npx prisma generate` works locally because `backend/node_modules` has Prisma 5 from `npm install --prefix backend`
- Root `package.json` has `install:all` script: `npm install --prefix backend && npm install --prefix frontend`
- CI used `npm install` instead of `npm run install:all`, skipping backend dependency installation
- `npm install` at root only installs `concurrently` (the sole root devDependency)

### Resolution

Changed CI install step from:
```yaml
- name: Install dependencies
  run: npm install
```
To:
```yaml
- name: Install all dependencies (root, backend, frontend)
  run: npm run install:all
```

This installs backend dependencies including Prisma 5, so `npx prisma` uses the local version instead of downloading Prisma 7.

### Alternative Solutions Considered

- Using `npm install --prefix backend` as a separate step — functionally equivalent but `install:all` is cleaner since it already exists in root package.json
- Using `cd backend && npx prisma generate` — same result once deps are installed
- Installing Prisma 5 globally — unnecessary and pollutes CI environment

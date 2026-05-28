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

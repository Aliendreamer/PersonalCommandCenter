## 1. Service + pre-wired connection

- [x] 1.1 Create `harness/pgadmin/servers.json` with the PCC Postgres server entry (`postgres:5432`,
      MaintenanceDB `pcc`, user `pcc`; no password).
- [x] 1.2 Add a `pgadmin` service to `docker-compose.yml` (`dpage/pgadmin4:latest`;
      `PGADMIN_DEFAULT_EMAIL`/`PGADMIN_DEFAULT_PASSWORD` dev defaults; `pgadmin-data:/var/lib/pgadmin`;
      mount `./harness/pgadmin/servers.json:/pgadmin4/servers.json:ro`; `depends_on: postgres`). No host
      port. Declare the `pgadmin-data` volume.

## 2. Traefik route

- [x] 2.1 In `harness/traefik/dynamic.yml` add a `pgadmin` router (`Host(pgadmin.pcc.localhost)`) +
      service → `http://pgadmin:80`.

## 3. Verify (live smoke)

- [x] 3.1 `docker compose up -d pgadmin` (+ proxy already up); `curl -H "Host: pgadmin.pcc.localhost"
      http://127.0.0.1/` serves the login (`200`/redirect to login). Confirm no regression on the other
      routes.
- [x] 3.2 Log into pgAdmin (dev creds) and confirm the PCC Postgres server is pre-listed; connecting
      with the DB password (`POSTGRES_PASSWORD`, dev `pcc-dev`) reaches the `pcc` database.

## 4. Docs + done gate

- [x] 4.1 Update `DOCKER_SETUP.md` (add the `pgadmin.pcc.localhost` route) and `CLAUDE.md` (extend the
      base-infra note). Mark complete; ready for `/opsx:archive`.

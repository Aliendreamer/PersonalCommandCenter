## ADDED Requirements

### Requirement: Routable pgAdmin (pre-wired to Postgres)

PCC compose SHALL host a pgAdmin service with a persistent volume, reached via the
`pgadmin.pcc.localhost` Traefik route (no published host port), with a dev login. It SHALL be pre-wired
with the PCC Postgres connection (`postgres:5432`, db `pcc`, user `pcc`) via a mounted `servers.json`,
so the server is listed on first login (the user supplies the DB password).

#### Scenario: pgAdmin serves over its route

- **WHEN** the stack is up and a client requests `http://pgadmin.pcc.localhost/`
- **THEN** pgAdmin serves its login/console (`200`)

#### Scenario: PCC Postgres is pre-listed

- **WHEN** the user logs into pgAdmin for the first time
- **THEN** the PCC Postgres server (`postgres:5432`, db `pcc`) is already present in the server list

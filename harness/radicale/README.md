# Radicale (CalDAV) — local harness

Internal-only CalDAV server backing the `calendar` plugin. **No Traefik route** — it is reached
only as `radicale:5232` on the compose network (from core-api).

- **Config:** `config` (htpasswd auth, plain encryption, `owner_only` rights, storage under `/data`).
- **Dev credential:** `users` holds a single committed dev login `pcc:pcc-dev-caldav` — local-only,
  same spirit as the committed Keycloak `testuser`. Override at the core-api side with `.env`
  `CALDAV_USER`/`CALDAV_PASSWORD`; if you change them, update `users` to match.
- **Collection:** core-api targets `/pcc/calendar/` (config `Plugins:Calendar:Collection`). The
  `calendar` plugin's `CalDavClient` issues `MKCALENDAR` on demand, so the collection is created on
  the first write — no manual seeding required.

Bring it up with the rest of the stack: `docker compose up -d radicale`. Data persists in the
`radicale-data` volume.

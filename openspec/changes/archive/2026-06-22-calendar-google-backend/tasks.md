# Google Calendar backend — tasks (TDD)

## 1. Config + contract — DONE

- [x] 1.1 `GoogleCalendarOptions` (Enabled/ClientId/ClientSecret/RefreshToken + `IsConfigured`);
  `Plugins:Calendar:Google:Enabled` in appsettings; empty keys in `.env.example` + `.env`
- [x] 1.2 `CalendarEvent.Source` (default `pcc`); TS `CalendarSource`, optional `source`, input `calendar`

## 2. GoogleCalendarClient (TDD) — DONE

- [x] 2.1 Refresh-token→access-token exchange (cached); 401 surfaces failure
- [x] 2.2 `ListAsync` maps timed + all-day (`singleEvents=true`); create/update/delete verbs+URLs; 404 paths
- [x] 2.3 `GoogleCalendarClient : ICalendarSourceClient` (5 tests green)

## 3. Aggregation + routing (TDD) — DONE

- [x] 3.1 `ICalendarSourceClient` (Source + CRUD); `CalDavClient` is the `pcc` source
- [x] 3.2 `AggregateCalendarClient` merges sorted + tags source; one-source-failure degrades, all-fail
  throws; writes route by source (5 tests green)
- [x] 3.3 Plugin resolves the aggregate; Google added only when configured

## 4. Endpoints (TDD) — DONE

- [x] 4.1 List returns `source`; `POST` honours `calendar` target; `PUT`/`DELETE` route by `?source`;
  `GET /api/calendar/sources` advertises the writable calendars; degraded merge (partial 200, all 502)
- [x] 4.2 Endpoints updated (endpoint fakes too)

## 5. Web (TDD) — DONE

- [x] 5.1 Source badge ("Google") on event rows
- [x] 5.2 Create-form PCC/Google target picker (only when Google enabled); edit/delete pass the event's
  source; degraded sources settle gracefully
- [x] 5.3 Server fns + web loaders thread `calendar`/`source`

## 6. Gates + deploy

- [x] 6.1 `.NET` build/test (181)/format + `pnpm` typecheck/lint/test (147+17)/build/format:check green
- [ ] 6.2 (operator) Obtain a Google refresh token, fill the 3 `.env` keys + set
  `Plugins:Calendar:Google:Enabled=true`, then `docker compose up -d --build core-api` + `pnpm fe:rebuild`

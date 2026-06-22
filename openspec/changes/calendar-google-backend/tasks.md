# Google Calendar backend — tasks (TDD)

## 1. Config + contract

- [ ] 1.1 `CalendarOptions.Google` (`Enabled`, `ClientId`, `ClientSecret`, `RefreshToken`); defaults
  (Enabled=false); `appsettings.json` `Plugins:Calendar:Google:Enabled`; `.env.example` lines
- [ ] 1.2 `CalendarEvent` record + `@pcc/contracts` type gain `source` (`pcc` | `google`); create input
  gains optional `calendar`; update/delete carry `source`

## 2. GoogleCalendarClient (TDD)

- [ ] 2.1 Tests: refresh-token→access-token exchange (stubbed token endpoint, cached until ~expiry);
  401 → failure — watch fail
- [ ] 2.2 Tests: `ListAsync` maps Google events incl. an expanded recurring instance + an all-day event;
  `CreateAsync`/`UpdateAsync`/`DeleteAsync` hit the right verb+URL — watch fail
- [ ] 2.3 Implement `GoogleCalendarClient : ICalendarSourceClient` (token cache; `/calendars/primary/events`
  with `singleEvents=true`; CRUD)

## 3. Aggregation + routing (TDD)

- [ ] 3.1 Introduce `ICalendarSourceClient` (`Source` + CRUD); make `CalDavClient` implement it (`pcc`)
- [ ] 3.2 Tests: `AggregateCalendarClient` merges sources sorted by start + tags `source`; one source
  failing degrades (returns the other), both failing throws; writes route by source — watch fail
- [ ] 3.3 Implement `AggregateCalendarClient : ICalendarClient`; plugin resolves it (Google source added
  only when enabled)

## 4. Endpoints (TDD)

- [ ] 4.1 Tests: list returns `source`; `POST` honours `calendar` target; `PUT`/`DELETE` route by
  `?source`; partial source failure → `200` (degraded), all sources fail → `502` — watch fail
- [ ] 4.2 Update the calendar endpoints for the target/source params + degraded merge

## 5. Web (TDD)

- [ ] 5.1 Source badge on events (grid dots / day cells / Upcoming list)
- [ ] 5.2 Create-form "Calendar" selector (PCC / Google), shown only when Google is enabled; edit/delete
  pass the event's `source`; degraded-Google notice
- [ ] 5.3 Server fns pass `calendar`/`source` through

## 6. Gates + deploy

- [ ] 6.1 `dotnet build`/`test`/`format` + `pnpm typecheck`/`lint`/`test`/`build`/`format:check` green
- [ ] 6.2 Operator sets the 3 secrets in `.env` + flips `Enabled`; `pnpm fe:rebuild` (FE) +
  `docker compose up -d --build core-api` (BE) to apply

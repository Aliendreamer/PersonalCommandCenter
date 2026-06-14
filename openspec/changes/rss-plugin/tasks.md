## 1. Backend — feed client + `rss` plugin (TDD)

- [ ] 1.1 (TDD) Create `plugins/rss/rss.api`; `IFeedClient` + an `RssItem` model
      (`Title, Link, Published, Source`). Add `System.ServiceModel.Syndication`. Implement
      `RssClient : IFeedClient` over a named `HttpClient` (`RssOptions{Feeds[],MaxItems}`):
      fetch each feed, parse with `SyndicationFeed`, per-feed try/catch (skip bad), aggregate
      newest-first, cap at `MaxItems`. Unit-test parsing an RSS sample + an Atom sample + the
      skip-bad-feed behaviour.
- [ ] 1.2 Implement `RssPlugin : IPlugin` (id `rss`; nav "Feeds", `routeBase` `/rss`, widget
      `rss-latest`; `Configure` registers `IFeedClient` + the named `HttpClient` + `RssOptions`).
      FastEndpoints `GET /api/rss`: no feeds / all-failed → `502`; require auth. Register in
      `CoreApi.csproj`, `Program.cs`, `PersonalCommandCenter.slnx`, Dockerfile; `Plugins:Rss` config
      (appsettings + compose env).
- [ ] 1.3 (TDD) `CoreApi.Tests` integration tests (fake `IFeedClient`): aggregated items; `502` when
      empty/failed; requires auth; disabled plugin absent from `/api/plugins`.

## 2. Contracts — shared type + client (TDD)

- [ ] 2.1 (TDD) `@pcc/contracts`: `RssItem` type + `getRss()` client method; client tests (mock fetch).

## 3. Web — read path (SSR-with-data)

- [ ] 3.1 (TDD) `lib/server`: `loadRss` + `getRss` server fn; loader unit test (URL).
- [ ] 3.2 `rss-latest` tile — presentational (`{ items?, error? }`): latest headline or count,
      degraded on error; component test. An `RssItemList` presentational component + test.
- [ ] 3.3 `_authenticated/rss` route: loader (`settle(getRss())`) renders the items **server-side**;
      dashboard renders the `rss-latest` tile. `generate-routes`.

## 4. Verify + done gate

- [ ] 4.1 FE gates green: `generate-routes`; `nx run-many -t typecheck lint test build` + prettier.
- [ ] 4.2 .NET gates green: `dotnet build` + `dotnet test` + `dotnet format --verify-no-changes`.
- [ ] 4.3 E2E (Playwright, live stack; configure a known stable feed): login; `/rss` server-rendered
      with items; the `rss-latest` tile shows a headline; browser only hit `app.`; `api.` stays `404`.
- [ ] 4.4 Update `CLAUDE.md` (the `rss` plugin + `Plugins:Rss`); mark complete; ready for
      `/opsx:archive`.

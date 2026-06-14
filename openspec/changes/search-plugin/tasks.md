## 1. Infra — self-hosted SearXNG

- [x] 1.1 Add a `searxng` service to `docker-compose.yml` (image `searxng/searxng`, internal; mount
      `harness/searxng/settings.yml`). Add `harness/searxng/settings.yml` (`use_default_settings`,
      dev `secret_key`, `server.limiter: false`, `search.formats: [html, json]`). Optional
      `searxng.pcc.localhost` Traefik route. core-api gets `Plugins:Search:{Enabled,BaseUrl=
      http://searxng:8080}` (compose env + appsettings).
- [x] 1.2 `docker compose config` valid; bring `searxng` up and confirm a JSON query
      (`/search?q=test&format=json`) returns `results` from the compose network (smoke).

## 2. Backend — SearXNG client + `search` plugin (TDD)

- [ ] 2.1 (TDD) Create `plugins/search/search.api` classlib; `ISearchClient` + a `SearchResult`
      model (`Title`, `Url`, `Content?`, `Engine?`). Implement `SearxngClient : ISearchClient` over a
      named `HttpClient` (`SearchOptions{BaseUrl}`): `SearchAsync(query)` → `GET {BaseUrl}/search?q=…
      &format=json`, parse `results[]`, map top N. Unit-test with a stub `HttpMessageHandler` (sends
      `q`+`format=json`; maps a sample SearXNG JSON payload).
- [ ] 2.2 Implement `SearchPlugin : IPlugin` (id `search`; manifest nav "Search", `routeBase`
      `/search`, widget `search-box`; `Configure` registers `ISearchClient` + the named `HttpClient`
      + `SearchOptions`). Lazy `Resolve<T>()`.
- [ ] 2.3 FastEndpoints `GET /api/search?q=…`: blank/whitespace `q` → `400`; map `ISearchClient`
      failure/unconfigured → `502`; require auth. Register in `CoreApi.csproj`, `Program.cs`
      `pluginAssemblies`, `PersonalCommandCenter.slnx`, Dockerfile.
- [ ] 2.4 (TDD) `CoreApi.Tests` integration tests (fake `ISearchClient`): returns mapped results;
      blank `q` → `400`; SearXNG failure → `502`; requires auth; disabled plugin absent from
      `/api/plugins`.

## 3. Contracts — shared type + client (TDD)

- [ ] 3.1 (TDD) `@pcc/contracts`: `SearchResult` type + a `getSearch(q)` client method (URL-encodes
      `q`); client tests against a mock fetch.

## 4. Web — read path (query-driven SSR)

- [ ] 4.1 (TDD) `lib/server`: `loadSearch(fetchImpl, q)` (URL-encodes `q`) + the `getSearch` server
      function (validator `q`) wrapping it with `serverFetch`; unit-test the loader (URL shaping).
- [ ] 4.2 `SearchResultList` — presentational (`{ results, error? }`): renders the result list (title
      links to url + snippet/engine) or a degraded "Search unavailable"; component test. A
      `search-box` tile (a form that navigates to `/search?q=`); component test.
- [ ] 4.3 `_authenticated/search` route: a `q` search param + `loaderDeps`; the loader runs
      `getSearch` (via `settle`) **only when `q` is present** (else `null`); the page renders a search
      form (navigates to `/search?q=`) + the `SearchResultList` **server-side**; the dashboard renders
      the `search-box` tile for the `search-box` widget. `pnpm --filter web generate-routes`.

## 5. Verify + done gate

- [ ] 5.1 FE gates green: `generate-routes`; `nx run-many -t typecheck lint test build`
      (web + `@pcc/contracts`) + `prettier --check`.
- [ ] 5.2 .NET gates green: `dotnet build` (warnings = errors) + `dotnet test` + `dotnet format
      --verify-no-changes`.
- [ ] 5.3 E2E (Playwright, live stack with `searxng`): `docker compose up -d --build`; login;
      `/search` is server-rendered (box, no results for empty `q`); submit a query → results render
      **server-side**; the browser only ever hit `app.`; `api.pcc.localhost` stays **404**.
- [ ] 5.4 Update `CLAUDE.md` (the `search` plugin + self-hosted `searxng` service + `Plugins:Search`
      config) and the plugin layout; mark tasks complete; ready for `/opsx:archive`.

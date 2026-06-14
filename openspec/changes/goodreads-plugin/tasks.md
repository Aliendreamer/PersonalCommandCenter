## 1. Backend — Goodreads shelf client + plugin (TDD)

- [ ] 1.1 (TDD) Create `plugins/goodreads/goodreads.api`; `IGoodreadsClient` + a `Book` model
      (`Title, Author?, Link, CoverUrl?`). Add `System.ServiceModel.Syndication`. Implement
      `GoodreadsClient : IGoodreadsClient` over a named `HttpClient` (`GoodreadsOptions{UserId,Shelf}`):
      GET `…/review/list_rss/{UserId}?shelf={Shelf}`, parse with `SyndicationFeed`, map each item
      (title; `author_name`/`book_image_url` custom elements; first link). Unit-test mapping against a
      captured Goodreads RSS sample (incl. the custom elements).
- [ ] 1.2 Implement `GoodreadsPlugin : IPlugin` (id `goodreads`; nav "Reading", `routeBase`
      `/goodreads`, widget `goodreads-reading`; `Configure` registers the client + named `HttpClient`
      + options). FastEndpoints `GET /api/goodreads`: unconfigured/failure → `502`; require auth.
      Register in `CoreApi.csproj`, `Program.cs`, `PersonalCommandCenter.slnx`, Dockerfile;
      `Plugins:Goodreads` config (appsettings + compose env).
- [ ] 1.3 (TDD) `CoreApi.Tests` integration tests (fake `IGoodreadsClient`): returns books; `502` on
      failure; requires auth; disabled plugin absent from `/api/plugins`.

## 2. Contracts — shared type + client (TDD)

- [ ] 2.1 (TDD) `@pcc/contracts`: `Book` type + `getGoodreads()` client method; client tests (mock fetch).

## 3. Web — read path (SSR-with-data)

- [ ] 3.1 (TDD) `lib/server`: `loadGoodreads` + `getGoodreads` server fn; loader unit test (URL).
- [ ] 3.2 `goodreads-reading` tile — presentational (`{ books?, error? }`): current shelf titles/count,
      degraded on error; component test. A `BookList` presentational component (cover + title + author)
      + test.
- [ ] 3.3 `_authenticated/goodreads` route: loader (`settle(getGoodreads())`) renders the books
      **server-side**; dashboard renders the `goodreads-reading` tile. `generate-routes`.

## 4. Verify + done gate

- [ ] 4.1 FE gates green: `generate-routes`; `nx run-many -t typecheck lint test build` + prettier.
- [ ] 4.2 .NET gates green: `dotnet build` + `dotnet test` + `dotnet format --verify-no-changes`.
- [ ] 4.3 E2E (Playwright, live stack; configure a public Goodreads user/shelf): login; `/goodreads`
      server-rendered with books; the tile shows the shelf; browser only hit `app.`; `api.` stays `404`.
- [ ] 4.4 Update `CLAUDE.md` (the `goodreads` plugin + `Plugins:Goodreads` + the API-is-dead/RSS
      note); mark complete; ready for `/opsx:archive`.

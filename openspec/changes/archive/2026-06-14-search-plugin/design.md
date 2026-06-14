## Context

`search` is a thin read-only plugin — structurally the `iot` plugin (query an external service, map
results, degrade to `502`) — plus a **self-hosted SearXNG** (the `:8888` instance is another
project's). The only new wrinkle on the web side is a **query-param-driven SSR loader** (`/search?q=`),
the first param-driven loader in the app. Auth, Traefik, the SSR-BFF, and the self-host pattern all
already exist.

## Goals / Non-Goals

**Goals:**

- A `search` plugin matching `iot`: `api/search`, config-driven activation, `502` degradation, a nav
  entry + `/search` page + `search-box` tile.
- Self-host SearXNG in compose with its JSON API enabled for server-to-server queries.
- SSR-with-data for the current query (server-rendered results), via a `q` search param.

**Non-Goals:**

- Engine selection / filters / pagination / safesearch / autocomplete / caching / verticals /
  history persistence. SearXNG external reachability (internal-only).

## Decisions

- **Self-hosted SearXNG** (`searxng/searxng`), internal-only. `harness/searxng/settings.yml` sets
  `use_default_settings: true` + `server.secret_key` (dev value) + `server.limiter: false` (the bot
  limiter would block core-api's server-to-server requests) + `search.formats: [html, json]` (the
  JSON API is off by default). core-api reaches it at `http://searxng:8080`; an optional
  `searxng.pcc.localhost` Traefik route exposes its UI for debugging.
- **`SearxngClient : ISearchClient`** over a named `HttpClient` — `SearchAsync(query)` issues
  `GET {BaseUrl}/search?q=<urlencoded>&format=json`, deserializes the `results[]` array, and maps the
  top N (e.g. 20) to `{ Title, Url, Content?, Engine? }`. Abstracted so the endpoint instantiates at
  startup even when disabled (lazy `Resolve<T>()`) and tests inject a fake.
- **Validation/degradation = the IoT contract.** Blank/whitespace `q` → `400` (don't query);
  `ISearchClient` failure/unconfigured → `502`; the tile/page degrade.
- **Query-param SSR loader.** `/search` declares a `q` search param; `loaderDeps: ({ search }) =>
  ({ q: search.q })` and `loader: ({ deps }) => deps.q ? settle(getSearch({ data: deps.q })) : null`
  — so navigating `/search?q=…` re-runs the loader server-side and renders results; bare `/search`
  renders the box with no API call. The page's form does a router `navigate({ to: '/search', search:
  { q } })`. `getSearch` is a GET server fn with a `q` validator.
- **`search-box` tile** is a tiny form that `navigate`s to `/search?q=<input>` — search is
  query-driven, so the dashboard surface is an entry point, not a data readout.

## Risks / Trade-offs

- **SearXNG blocks the JSON API by default** (limiter + formats) → the committed `settings.yml`
  enables `json` and disables the limiter; documented in the harness. Verified by a live smoke query.
- **SearXNG result shape varies by engine** → map defensively (title/url required; content/engine
  optional, may be absent) and unit-test the mapping against a representative JSON sample.
- **First query-param loader** → `loaderDeps` must include `q` so TanStack re-runs the loader on
  param change; covered by the E2E (submit → results) and a loader unit test on URL shaping.
- **Self-hosted SearXNG is heavier than ntfy/Radicale** (it spawns engine requests) but is a single
  container; internal-only keeps it simple. No Redis (v1 single-user, no rate concerns).

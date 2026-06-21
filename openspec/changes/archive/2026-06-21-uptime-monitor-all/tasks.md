## 1. TCP check path (TDD)

- [x] 1.1 `HttpUptimeClientTests`: a reachable TCP target → `up: true`; a refused/timed-out TCP target →
  `up: false` (still a `200` board, "down is data")
- [x] 1.2 `HttpUptimeClient` selects TCP-connect vs HTTP per target, timeout-bounded and concurrent

## 2. Dogfood config

- [x] 2.1 Broaden `Plugins:Uptime:Targets` to every core PCC service (HTTP + TCP-only); broaden
  `Plugins:Rss:Feeds`

## 3. Gates

- [x] 3.1 All `dotnet` + `pnpm` gates green

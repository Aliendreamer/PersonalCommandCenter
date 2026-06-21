## Why

> Retroactive spec — shipped directly to `main` (commits `02b2238`, `dddd4cc`, `ede58b8`) ahead of its
> proposal. Captured here to keep the `uptime` spec the source of truth.

The uptime board only HTTP-pinged a couple of dogfood targets. To be a real status board it should
cover every PCC container — but some of them (e.g. Redis, Postgres) expose no HTTP endpoint, so an
HTTP ping always reports them down. Those need a TCP-connect check instead.

## What Changes

- **A target may be checked over TCP** (a connect to host:port) when it has no HTTP endpoint, in
  addition to the existing HTTP ping. `up` = the HTTP response is `< 400` **or** the TCP connect
  succeeds within the timeout. The "a down target is data, not a request error" contract is unchanged.
- **The configured target set is broadened to every core PCC service** (the dogfood expansion), mixing
  HTTP and TCP-only targets. (RSS feeds were broadened in the same config pass — config-only, no
  contract change.)

## Capabilities

### Modified Capabilities
- `uptime`: targets can be checked over TCP (for services with no HTTP endpoint) as well as HTTP; a
  failed TCP connect is `up: false`, consistent with the existing "down is data" rule.

## Impact

- **.NET**: `HttpUptimeClient` gains a TCP-connect path (timeout-bounded, concurrent) selected per
  target; `Plugins:Uptime:Targets` config broadened.
- **Tests**: `HttpUptimeClientTests` (TCP up + TCP refused/timeout → down).
- **Config**: `appsettings.json` uptime targets + rss feeds (no contract change).

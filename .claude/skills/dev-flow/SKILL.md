---
name: dev-flow
description: Use when starting, implementing, or completing any feature/change/plugin in an Nx + .NET + TanStack Start project (e.g. PersonalCommandCenter) — at feature start, before writing code, and before claiming any change done or green.
---

# Dev Flow

## Overview

The repeatable cycle for building and changing this project, one subsystem/plugin at a
time. Each change runs the same loop: **brainstorm → OpenSpec propose → OpenSpec apply with
TDD → review → verify all green → archive.** Navigation and edits use Serena's semantic
tools. **A change is not done until every quality gate and test is green.**

**Core principle:** No change is "done" on assertion. Done = gates and tests run, output
seen, all green. Evidence before claims.

## When to Use

- Starting any new subsystem, plugin, or feature.
- Before writing implementation code for a change.
- Before claiming a change is "done", "fixed", "working", or "green".
- Before committing, merging, or archiving an OpenSpec change.

## The Cycle

1. **Brainstorm** — work the idea into a design with the user (approaches, trade-offs,
   decisions). Get explicit approval before any code. The design is captured in the OpenSpec
   change's `design.md` (next step) — **never** in loose `docs/` files.
2. **Propose** (`/opsx:propose`) — create the OpenSpec change: proposal, design, tasks.
3. **Apply with TDD** (`/opsx:apply`, `superpowers:test-driven-development`) — for each task:
   write the failing test first, watch it fail, write minimal code, watch it pass, refactor.
4. **Edit with Serena** — use Serena semantic tools (`find_symbol`, `replace_symbol_body`,
   `find_referencing_symbols`, etc.) for navigation/edits over raw text search where it helps.
5. **Add tests for every new functionality** — no behavior ships without a test that covers
   it. New endpoint, new plugin, new widget, new branch of logic → new test.
6. **Verify all green** (Quality Gates below) — run the gates, read the output, confirm green.
7. **Review** (`superpowers:requesting-code-review` or `/code-review`) before merge.
8. **Archive** (`/opsx:archive`) — finalize the OpenSpec change once implemented and green.

## Quality Gates (must be GREEN before a change is done)

Run the gates for whatever the change touched. In this Nx monorepo, prefer `affected`.

**.NET (core-api + `*.api` plugin modules):**
```bash
dotnet build      -warnaserror           # build clean, warnings fail
dotnet format     --verify-no-changes    # formatting/analyzers
dotnet test                              # all tests pass
```

**TanStack Start / frontend (`web` + `*.ui` plugin libs):**
```bash
nx affected -t typecheck     # tsc --noEmit, no type errors
nx affected -t lint          # eslint clean
nx affected -t test          # vitest/jest pass
nx affected -t build         # builds clean
npx prettier --check .       # formatting
```

**Whole-change gate:** when in doubt run `nx run-many -t lint test build typecheck` plus the
.NET trio. If any command is non-zero or any test red, the change is **not done** — fix it.

## The Done Gate (non-negotiable)

A change is done ONLY when ALL of these are true and you have **seen the output**:

- [ ] Every new/changed functionality has a test covering it.
- [ ] `.NET` gates green (build · format · test).
- [ ] Frontend gates green (typecheck · lint · test · build · prettier).
- [ ] OpenSpec tasks for the change are checked off.

## Red Flags — STOP, you are about to violate the flow

- "It's a small change, I'll skip the test." → Small changes break. Write the test.
- "I'll write the test after." → Tests-after prove nothing. Test first (TDD).
- "It builds, so it's done." → Done = all gates + tests green, output seen.
- "I'm confident it passes." → Confidence is not evidence. Run the gate, read the output.
- "I'll just edit the text directly." → Use Serena semantic tools where they apply.
- Claiming green without running the commands. → Run them. Observe the result.

All of these mean: stop, run the gate, write the missing test, and confirm green before
saying done.

## Releasing

Versioning and changelogs use **Nx Release**, driven by Conventional Commits (which this
flow already produces). One fixed version spans the whole repo — JS and .NET stay in lockstep.

- **Preview:** `pnpm release:dry` — reports the next version + changelog, changes nothing.
- **Release:** `pnpm release` — bumps versions, stamps `<Version>` into `Directory.Build.props`,
  updates root `CHANGELOG.md`, then commits `chore(release): vX.Y.Z` and tags `vX.Y.Z`.
- First release only: `pnpm release --first-release` (seeds the baseline).

Release after a meaningful batch of `feat`/`fix` commits is on `main` and green. Nothing is
published (private workspace); nothing is pushed (no remote yet).

## Conventions this flow assumes

- **Plugins are compile-time modules activated via `appsettings`** (`Plugins:{id}:Enabled`).
- **A plugin = an `*.api` .NET module + a matching `*.ui` Nx React lib.**
- **Hybrid boundary:** device/IoT logic goes through Home Assistant; the UI never calls HA
  directly — only via core-api.
- **Deploy via docker-compose**; adding infra (e.g. `home-assistant`) = another service.
- All design + specs live in OpenSpec (`openspec/changes/<name>/`, then archived). No `docs/` spec files.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Coding before a design/proposal exists | Brainstorm → propose first. |
| Implementation before a failing test | TDD: red, then green. |
| Marking done with red/unknown gate state | Run gates, see green, then done. |
| New endpoint/widget with no test | Add the test as part of the same change. |
| Editing by blind text replace | Use Serena `find_symbol` / `replace_symbol_body`. |

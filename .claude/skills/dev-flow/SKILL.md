---
name: dev-flow
description: Use when starting, implementing, or completing any feature/change/plugin in an Nx + .NET + TanStack Start project (e.g. PersonalCommandCenter) — at feature start, before writing code, and before claiming any change done or green.
---

# Dev Flow

## Overview

The repeatable cycle for building and changing this project, one subsystem/plugin at a
time. Each change runs the same loop: **brainstorm → OpenSpec propose → TDD → gates green
→ archive → skill-optimizer.** **A change is not done until every quality gate and test is green.**

**Core principle:** No change is "done" on assertion. Done = gates and tests run, output
seen, all green. Evidence before claims.

## HARD RULES (never skip)

1. **Never implement without a proposal first.** Create `openspec/changes/<name>/` with
   `proposal.md`, `design.md`, `tasks.md` before writing any code.
2. **TDD only.** Write the failing test, watch it fail, then write minimal code to pass it.
   Never write code before the failing test exists.
3. **No superpowers skills.** Do NOT invoke `opsx:propose`, `opsx:apply`, `opsx:archive`,
   `superpowers:*`, or any other superpowers Skill. Use the `openspec` CLI and `Bash` directly.
4. **Run skill-optimizer after every archive.** This is a standing post-archive step.

## The Cycle

1. **Brainstorm** — design with the user. Get explicit approval before any code. Capture the
   design in `openspec/changes/<name>/design.md` — **never** in loose `docs/` files.

2. **Propose** — create the OpenSpec change manually:
   ```bash
   mkdir -p openspec/changes/<name>
   # Write proposal.md, design.md, tasks.md
   ```

3. **Apply with TDD** — for each task:
   - Write the failing test first (`dotnet test --filter ... 2>&1` — expect red build errors)
   - Write minimal code to make it compile and pass
   - Run again — expect green
   - Run `dotnet format` to auto-fix style
   - **NOTE:** `dotnet test` and `dotnet build` require `dangerouslyDisableSandbox: true` — named
     pipes are blocked by the sandbox. Always disable sandbox for `.NET` gate commands.

4. **Verify all green** (Quality Gates below) — run the gates, read the output, confirm green.

5. **Archive** — `openspec archive` CLI is interactive and blocks automation. Archive manually:
   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   git add openspec/changes/archive/YYYY-MM-DD-<name>
   git commit -m "chore(openspec): archive <name> change"
   ```

6. **Run skill-optimizer** — invoke the `skill-optimizer` Skill immediately after every archive
   to improve any skills exercised during the change.

## Quality Gates (must be GREEN before a change is done)

**.NET (core-api + `*.api` plugin modules) — always use `dangerouslyDisableSandbox: true`:**
```bash
dotnet build                        # warnings are errors; 0 errors required
dotnet test                         # all tests pass
dotnet format --verify-no-changes   # formatting/analyzers clean
```

**TanStack Start / frontend (`web` + `*.ui` plugin libs):**
```bash
pnpm typecheck    # nx run-many -t typecheck
pnpm lint         # nx run-many -t lint
pnpm test         # nx run-many -t test
pnpm build        # nx run-many -t build
pnpm format:check # prettier --check .
```

## The Done Gate (non-negotiable)

A change is done ONLY when ALL of these are true and you have **seen the output**:

- [ ] Every new/changed functionality has a test covering it.
- [ ] `.NET` gates green (build · test · format) — output seen, not assumed.
- [ ] Frontend gates green (typecheck · lint · test · build · prettier) — if FE was touched.
- [ ] Committed to `main`.
- [ ] Archived in `openspec/changes/archive/`.
- [ ] `skill-optimizer` run.

## Red Flags — STOP, you are about to violate the flow

- Implementing before a proposal + design exists → create the change first.
- Writing code before a failing test → TDD: red first, then green.
- Using `/opsx:*` or `superpowers:*` Skill invocations → use `openspec` CLI or `Bash` directly.
- Running `dotnet` commands without `dangerouslyDisableSandbox: true` → sandbox blocks named pipes.
- Using `openspec archive` CLI non-interactively → it prompts for confirmation; use `mv` instead.
- Claiming green without running the commands → run them, observe the output.
- Skipping `skill-optimizer` after archive → always run it.

## Releasing

Versioning and changelogs use **Nx Release**, driven by Conventional Commits.

- **Preview:** `pnpm release:dry`
- **Release:** `pnpm release` — bumps versions, updates `CHANGELOG.md`, commits + tags `vX.Y.Z`.
- First release only: `pnpm release --first-release`.

## Conventions

- Plugins are compile-time modules activated via `appsettings` (`Plugins:{id}:Enabled`).
- A plugin = an `*.api` .NET module + optional `*.ui` Nx React lib.
- All design + specs live in OpenSpec (`openspec/changes/<name>/`, then archived). No `docs/` specs.
- Commit directly on `main` — no `feat/*` branches.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Coding before a proposal exists | Create `openspec/changes/<name>/` first. |
| Implementation before a failing test | TDD: red, then green. |
| Using opsx/superpowers skills | Use `openspec` CLI or manual `Bash` directly. |
| `dotnet` commands blocked by sandbox | Always use `dangerouslyDisableSandbox: true`. |
| `openspec archive` hangs waiting for input | Use `mv` to archive manually. |
| Skipping skill-optimizer post-archive | Run `Skill("skill-optimizer")` after every archive. |
| Marking done without running gates | Run gates, see green output, then done. |

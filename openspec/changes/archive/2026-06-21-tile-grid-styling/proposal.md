## Why

> Retroactive spec — shipped directly to `main` (commits `ebb82b1`, `f9c1082`) ahead of its proposal.
> Captured here to keep the `ui-kit` spec the source of truth.

The dashboard tiles read as a soft, low-contrast wall: collection tiles (uptime, tasks) rendered their
items as loose stacks, and tile borders were too faint to separate the cards on the status board.

## What Changes

- **Tiles that show a collection render it as a uniform grid** of equal cells (uptime targets, tasks),
  rather than a loose vertical stack, so the status board reads as a board.
- **All tiles get a harder, starker border** so each card is clearly delineated from its neighbors.

## Capabilities

### Modified Capabilities
- `ui-kit`: collection tiles present their items as a uniform grid, and tiles use a stronger border —
  both derived from the shared Mantine theme, not per-component CSS.

## Impact

- **Web**: `uptime` + `tasks` tiles (grid layout), shared tile/card border via the theme.
- **Tests**: the affected tile component tests still pass (presentation only; no contract change).

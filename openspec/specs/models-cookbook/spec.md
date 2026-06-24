# models-cookbook Specification

## Purpose
Let the user browse Ollama's public model library, inspect VRAM requirements against the host GPU's
available memory, and pull (download) or delete models without leaving PCC.

## Requirements

### Requirement: Library endpoint

The `models` plugin SHALL expose `GET /api/models/library` that fetches the Ollama model registry.
Ollama does not expose a public library API directly; the endpoint SHALL return a curated static
catalogue (bundled JSON, updated with the plugin) listing models with: `name`, `description`,
`parameterSize`, `quantization`, `sizeGb`, `family`, `tags: string[]`.
The response SHALL be cached in FusionCache for 24 h (library rarely changes).

#### Scenario: Returns model catalogue

- **WHEN** a client requests `GET /api/models/library`
- **THEN** the response is `200` with a list of model entries

### Requirement: GPU-aware size recommendation

Each catalogue entry returned by `GET /api/models/library` SHALL include a `fits` field:
`"yes" | "marginal" | "no" | "unknown"` derived by comparing `sizeGb * 1.1` (10 % overhead) against
the total GPU VRAM reported by the GPU exporter (`gpus[0].memoryTotalMb`). `"unknown"` when the GPU
exporter is unavailable.

#### Scenario: Model fits comfortably

- **WHEN** a 4 GB model and the GPU has 8 GB total VRAM
- **THEN** `fits` is `"yes"`

#### Scenario: Model is too large

- **WHEN** a 14 GB model and the GPU has 8 GB total VRAM
- **THEN** `fits` is `"no"`

### Requirement: Pull endpoint

The `models` plugin SHALL expose `POST /api/models/pull` accepting `{ name: string }`.
It SHALL call Ollama's `POST /api/pull` and stream progress lines as newline-delimited JSON
(`{ status, completed?, total? }`) to the client via `text/event-stream`.
The endpoint returns `400` for an empty name and `502` when Ollama is unreachable.

#### Scenario: Pull streams progress

- **WHEN** the user requests a pull for `"llama3.2:3b"`
- **THEN** the SSE stream emits progress events (`pulling manifest`, `pulling layer`, `success`)
  and the connection closes when complete

### Requirement: Delete endpoint

The `models` plugin SHALL expose `DELETE /api/models/{name}` that calls Ollama's
`DELETE /api/delete` and returns `204`. Returns `404` if the model is not installed, `502` if
Ollama is unreachable.

#### Scenario: Delete an installed model

- **WHEN** the user deletes `"llama3.2"`
- **THEN** `DELETE /api/models/llama3.2` returns `204` and the model no longer appears in
  `/api/models`

### Requirement: Cookbook UI

The `models` page SHALL gain a **Cookbook** tab showing:
- A search/filter bar (by name, family, tag)
- A grid of model cards: name, description, size, family, parameter size, fits badge
  (green = yes, yellow = marginal, red = no, grey = unknown)
- Already-installed models show a **Delete** button; others show a **Pull** button
- Pull opens a modal with a live progress bar driven by the SSE stream; closes on success/error

#### Scenario: User pulls a model

- **WHEN** the user clicks Pull on a catalogue entry
- **THEN** a progress modal opens, streams live download status, and closes with a success toast
  on completion; the model card switches to showing a Delete button

#### Scenario: Fits badge reflects GPU

- **WHEN** the user opens the Cookbook tab and GPU data is available
- **THEN** each card displays a coloured fits badge indicating whether the model fits in VRAM

### Requirement: Config-driven activation

All cookbook endpoints and the tab activate with `Plugins:Models:Enabled`. A new optional config key
`Plugins:Models:Ollama:LibraryCacheHours` (default 24) controls catalogue cache TTL.

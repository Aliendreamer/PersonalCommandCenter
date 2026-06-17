# models Specification

## Purpose
TBD - created by archiving change models-plugin. Update Purpose after archive.
## Requirements
### Requirement: Model + GPU status

The `models` plugin SHALL query Ollama (installed models, running models, version) and a host GPU
exporter (per-GPU utilization, temperature, memory) and expose `GET /api/models` returning a single
`ModelsStatus`: `{ version, installed: [{ name, sizeBytes, family?, parameterSize?, quantization? }],
running: [{ name, sizeVramBytes }], gpus: [{ name, utilizationPct, temperatureC, memoryUsedMb,
memoryTotalMb }] }`.

#### Scenario: Returns installed and running models with GPU stats

- **WHEN** Ollama reports installed + running models and the GPU exporter reports one GPU, and a
  client requests `GET /api/models`
- **THEN** the response lists the installed models, the running models with their VRAM, the Ollama
  version, and the GPU's utilization/temperature/memory

#### Scenario: No models pulled is valid

- **WHEN** Ollama is reachable but no models are pulled
- **THEN** `GET /api/models` responds `200` with an empty `installed` list (not an error)

### Requirement: Config-driven activation

The `models` plugin SHALL activate only when `Plugins:Models:Enabled` is `true`, and SHALL appear in
`/api/plugins` with a "Models" nav entry and `models-status` widget when enabled.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Models:Enabled = false`
- **THEN** `GET /api/models` is not served and `models` is absent from `/api/plugins`

### Requirement: Graceful degradation

When Ollama is unreachable or unconfigured, the `models` plugin SHALL respond with `502`, and the UI
SHALL show a degraded state without breaking the dashboard. The GPU exporter being unreachable SHALL
degrade only the GPU panel (`gpus: []`) and SHALL NOT fail the request.

#### Scenario: Ollama unreachable

- **WHEN** Ollama is unreachable or unconfigured
- **THEN** `GET /api/models` responds with `502` and the Models tile/page show a degraded state

#### Scenario: GPU exporter down degrades only the GPU panel

- **WHEN** Ollama is reachable but the GPU exporter is unreachable
- **THEN** `GET /api/models` responds `200` with the models populated and an empty `gpus` list

### Requirement: Models UI surfaces (read-only via the SSR-BFF)

The `models` plugin SHALL contribute a "Models" nav entry, a `/models` page server-rendered with the
installed models, the running models (with VRAM), and a GPU panel, and a `models-status` dashboard
tile showing the model count and GPU utilization/temperature. Reads SHALL go through the SSR server —
the browser SHALL NOT call core-api directly.

#### Scenario: Models page is server-rendered

- **WHEN** the `/models` page is requested with model data available
- **THEN** the server-rendered HTML already lists the installed models and the GPU panel

#### Scenario: Status tile shows the model count

- **WHEN** the dashboard renders with the `models` plugin enabled and data available
- **THEN** the `models-status` tile shows the model count and GPU summary, degrading to a "Models
  unavailable" state on error


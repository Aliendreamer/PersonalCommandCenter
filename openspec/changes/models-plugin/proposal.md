## Why

The command center has no visibility into the local LLM stack. With PCC now hosting **Ollama** as
routable base infrastructure (the `base-infra` change), a glanceable "what models do I have, what's
loaded, how's the GPU?" board is the natural read-only surface — and the first plugin to consume the
shared Ollama + add host GPU telemetry.

**Depends on `base-infra`** (provides the `ollama` compose service). This change adds only the GPU
exporter sidecar (specific to this plugin's telemetry) and the plugin itself.

## What Changes

- **New `models` plugin** (`plugins/models/models.api`, id `models`; manifest nav "Models",
  `routeBase` `/models`, widget `models-status`). FastEndpoints `GET /api/models`: query Ollama
  (installed + running models + version) and a host GPU exporter (utilization/temp/memory), return a
  single `ModelsStatus`. An `IModelsClient` + `ModelsClient` (named `HttpClient`s). Ollama
  unreachable/unconfigured → `502` (degrade like `iot`); **zero models pulled = valid `200`** (empty
  `installed[]`); the **GPU exporter being down degrades only the GPU panel** (`gpus: []`, NOT a 502).
  Registered in the three compile-time places + `.slnx` + Dockerfile; endpoints require auth; lazy
  `Resolve<T>()`.
- **Consume the Ollama from `base-infra`** — core-api reaches it in-compose as `http://ollama:11434`
  (the GPU-enabled, routable Ollama is provisioned by the `base-infra` change, not here).
- **Self-host an nvidia GPU exporter sidecar** (nvidia-smi-wrapping, internal-only, `nvidia` runtime)
  so core-api reads host GPU telemetry without `nvidia-smi` in the core-api image (the "self-host a
  service, query it" mold — like SearXNG/Radicale). DCGM has weak WSL2 support → prefer nvidia-smi.
- Config `Plugins:Models:{Enabled, Ollama:{BaseUrl}, Gpu:{ExporterUrl}}`.
- `@pcc/contracts`: a `ModelsStatus` type (+ nested `InstalledModel`/`RunningModel`/`GpuStat`) and a
  `getModels()` client method.
- **Web (SSR-BFF, read-only)**: `lib/server` `loadModels` + `getModels` server fn; a `/models` route
  (SSR loader) rendering installed models, running models (with VRAM), and a GPU panel; a
  `models-status` dashboard tile (model count + GPU util/temp, degraded on error). No write path.

## Capabilities

### New Capabilities

- `models`: read-only model/GPU status board — the `api/models` endpoint that aggregates Ollama's
  installed + running models and version with host GPU telemetry (from a self-hosted nvidia-smi
  exporter), config-driven activation, graceful degradation (Ollama down → 502; GPU exporter down →
  GPU panel only), and the "Models" nav/page/`models-status` tile.

### Modified Capabilities

<!-- None. -->

## Impact

- **Depends on `base-infra`** for the `ollama` service. **Infra added here**: one new compose service —
  an **nvidia GPU exporter** sidecar (nvidia runtime, internal-only). core-api gains `Plugins:Models:*`
  config + two named `HttpClient`s (Ollama + the exporter).
- **Backend**: new `plugins/models/models.api` project + 3 registration points + `.slnx` + Dockerfile
  copy + appsettings + compose env.
- **Contracts/Web**: `@pcc/contracts` gains `ModelsStatus` (+ nested types); new
  `_authenticated/models` route, a tile, and a server function.
- **Tests**: client request-shaping/mapping unit tests (Ollama `/api/tags`+`/api/ps`+`/api/version`
  parse; GPU exporter parse; GPU-down → `gpus:[]` with models intact), `api/models` integration tests,
  contracts client tests, web loader/tile/page tests, and a live E2E (login → `/models` SSR-rendered).

## Non-Goals (v1)

Pulling/deleting/creating models from the UI (read-only — no Ollama mutations), any chat/inference/
prompt UI, model comparison, historical telemetry or graphs/time-series, multi-host Ollama, DCGM, and
non-NVIDIA GPUs. **Out of this change**: provisioning Ollama and the rest of the shared stack (Redis,
Qdrant, Portainer) — those live in the `base-infra` change; this change only adds the GPU exporter and
the plugin.

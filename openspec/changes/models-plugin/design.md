## Context

A read-only plugin in the `iot`/`uptime` mold, but it aggregates **two** internal upstreams — Ollama
(model inventory) and a host GPU exporter (telemetry) — into one `ModelsStatus`. It is the first
PCC-owned **Ollama** + **GPU** infrastructure, part of the base-infra pivot (PCC self-hosts the
substrate rather than monitoring the user's separate instances). The dev host has an NVIDIA RTX 5070
Laptop GPU with the Docker `nvidia` runtime available and WSL2 GPU paravirt (`/dev/dxg`), so
GPU-accelerated Ollama and host telemetry are feasible in compose.

## Goals / Non-Goals

**Goals:** a glanceable models + GPU board — installed/running models, Ollama version, and per-GPU
utilization/temp/memory; a `/models` page + `models-status` tile; Ollama and a GPU exporter
self-hosted in PCC compose with GPU access.

**Non-Goals:** model mutations (pull/delete/create) and any chat/inference UI, model comparison,
historical/time-series telemetry, multi-host Ollama, DCGM, non-NVIDIA GPUs. Provisioning Ollama and
the rest of the shared stack (Redis, Qdrant, Portainer) belongs to the `base-infra` change.

## Decisions

- **Two upstreams, one contract, asymmetric degradation.** Ollama is the primary source: unreachable/
  unconfigured → `502` (degrade like `iot`). The GPU exporter is **secondary**: if it is unreachable
  or unparseable, the endpoint still returns `200` with `gpus: []` (the GPU panel shows "unavailable",
  the models still render). Rationale: model inventory is the core value; GPU stats are a bonus and
  must not take the whole tile down. *(Alternative — fail the whole request when either upstream is
  down — rejected: it couples model visibility to GPU tooling that is more fragile under WSL2.)*

- **`ModelsClient : IModelsClient`** over named `HttpClient`s + `ModelsOptions { Ollama:{BaseUrl},
  Gpu:{ExporterUrl} }`. It calls Ollama `GET /api/tags` (installed: `name`, `size`, and
  `details.{family,parameter_size,quantization_level}`), `GET /api/ps` (running: `name`,
  `size_vram`), and `GET /api/version`, plus the GPU exporter, mapping all into `ModelsStatus`.
  Abstracted for lazy `Resolve<T>()` + fakes, exactly like `iot`/`uptime`.

- **GPU telemetry via a self-hosted nvidia-smi exporter sidecar**, not `nvidia-smi` inside core-api.
  Keeps the core-api image GPU-agnostic and matches the "self-host a service, query it" mold
  (SearXNG/Radicale/ntfy). The exporter runs with the `nvidia` runtime and wraps `nvidia-smi`
  (e.g. `utkuozdemir/nvidia_gpu_exporter`, Prometheus text exposition). core-api scrapes it and parses
  only the handful of series it needs (name, `utilization.gpu`, `temperature.gpu`, `memory.used`,
  `memory.total`). *(Alternatives: DCGM exporter — rejected, weak WSL2 support; core-api shells out to
  `nvidia-smi` — rejected, couples the API image + runtime to the GPU host.)*

- **Ollama is provided by `base-infra`** (GPU-enabled, routable at `ollama.pcc.localhost`, model
  volume); this change does not define it. core-api reaches it in-compose as `ollama:11434`. **The GPU
  exporter sidecar is added here** with the `nvidia` runtime + an all-GPUs device reservation
  (`deploy.resources.reservations.devices: [{ driver: nvidia, count: all, capabilities: [gpu] }]`),
  internal-only (no route), reached as the exporter's port on the compose network. *(The exporter is
  plugin-specific telemetry, not general shared infra, so it stays in this change rather than
  `base-infra`.)*

- **Web mirrors `uptime`/`iot`**: a `getModels` loader server fn feeds the `/models` route (installed
  list + running-with-VRAM + GPU panel) and the `models-status` tile (count + GPU summary), all
  presentational and `settle()`d so the tile degrades independently. All upstreams are internal, so no
  `safeHref` is needed (no third-party URLs rendered).

## Risks / Trade-offs

- **WSL2 GPU passthrough into containers can be finicky** (driver/runtime version coupling) → the GPU
  exporter is non-fatal by design (`gpus: []` on failure); the plugin remains useful as a pure model
  board even if GPU passthrough misbehaves. core-api itself never touches the GPU.

- **Ollama image + a model pull are large** (GBs) → the model volume persists across rebuilds; the
  E2E does not depend on a specific model being present (empty `installed[]` is a valid `200`), so it
  passes on a fresh Ollama with nothing pulled.

- **Prometheus exposition parsing is brittle if the exporter changes format** → core-api parses
  defensively (missing/garbled metrics → that GPU field is omitted / `gpus: []`), never throwing for
  GPU data. The exact exporter image + the metric names are pinned in the implementation.

- **GPU contention with the user's separate Ollama** (same physical GPU) → acceptable for a dev
  status board; PCC's Ollama is independent and only loads models on demand.

## Migration Plan

Additive only — new plugin + two new internal compose services. Enabled via `Plugins:Models:Enabled`;
disabling it removes the endpoint and nav. No data migrations. Rollback = disable the plugin / drop
the two services; nothing else depends on them.

## Open Questions

- Exact GPU exporter image + metric series to pin (settled during implementation against the running
  exporter output). Multi-GPU is listed but the dev host is single-GPU; the contract is already a
  list, so multi-GPU needs no contract change.

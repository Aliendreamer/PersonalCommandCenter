## 1. Infra — GPU exporter sidecar (Ollama comes from `base-infra`)

- [ ] 1.0 **Prereq:** the `base-infra` change provides the GPU-enabled `ollama` service
      (`ollama:11434`). Apply/confirm it first; this change does NOT define the Ollama service.
- [ ] 1.1 Add an **nvidia GPU exporter** sidecar to `docker-compose.yml` (nvidia-smi-wrapping image,
      `nvidia` runtime, all-GPUs reservation; internal-only, no Traefik route). Confirm it reports the
      RTX 5070 and pin the image + the metric series core-api will parse (name, util, temp, memory
      used/total).
- [ ] 1.2 Wire `core-api` env: `Plugins__Models__Enabled`, `Plugins__Models__Ollama__BaseUrl`
      (`http://ollama:11434`), `Plugins__Models__Gpu__ExporterUrl`; add `depends_on` for the exporter
      (and `ollama`).

## 2. Backend — models client + `models` plugin (TDD)

- [ ] 2.1 (TDD) Create `plugins/models/models.api`; `IModelsClient` + the `ModelsStatus` model
      (`Version`, `Installed:[{Name,SizeBytes,Family?,ParameterSize?,Quantization?}]`,
      `Running:[{Name,SizeVramBytes}]`, `Gpus:[{Name,UtilizationPct,TemperatureC,MemoryUsedMb,
      MemoryTotalMb}]`). Implement `ModelsClient : IModelsClient` over named `HttpClient`s
      (`ModelsOptions{Ollama:{BaseUrl},Gpu:{ExporterUrl}}`): call Ollama `/api/tags` + `/api/ps` +
      `/api/version`, and the GPU exporter; map all into `ModelsStatus`. Unit-test with a stub
      `HttpMessageHandler`: parses Ollama JSON (installed/running/version), parses the GPU exporter
      output, **GPU exporter down → `Gpus:[]` with models intact**, zero models → empty `Installed`.
- [ ] 2.2 Implement `ModelsPlugin : IPlugin` (id `models`; nav "Models", `routeBase` `/models`,
      widget `models-status`; `Configure` registers the client + named `HttpClient`s + options).
      FastEndpoints `GET /api/models`: Ollama unreachable/unconfigured → `502`; GPU-only failure is
      `200` with empty `gpus`; require auth. Register in `CoreApi.csproj`, `Program.cs`,
      `PersonalCommandCenter.slnx`, Dockerfile (2 COPYs); `Plugins:Models` config in `appsettings.json`.
- [ ] 2.3 (TDD) `CoreApi.Tests` integration tests (fake `IModelsClient`): returns models + GPU
      (`200`); `502` when Ollama fails; GPU-down still `200` with `gpus:[]`; requires auth; disabled
      plugin absent from `/api/plugins`.

## 3. Contracts — shared type + client (TDD)

- [ ] 3.1 (TDD) `@pcc/contracts`: `ModelsStatus` (+ nested `InstalledModel`/`RunningModel`/`GpuStat`)
      type + `getModels()` client method; client test (mock fetch); export from `index.ts`.

## 4. Web — read path (SSR-with-data)

- [ ] 4.1 (TDD) `lib/server`: `loadModels` + `getModels` server fn; loader unit test (URL).
- [ ] 4.2 `models-status` tile — presentational (`{ status?, error? }`): model count + GPU
      util/temp summary, degraded on error; component test.
- [ ] 4.3 A `/models` page (`_authenticated/models`): loader (`settle(getModels())`) renders the
      installed models, running models (with VRAM), and a GPU panel **server-side**; presentational
      list/panel components + tests. `generate-routes`.
- [ ] 4.4 Wire the `models-status` tile into the dashboard (`_authenticated/index.tsx` loader array +
      destructure + return object + widget branch).

## 5. Verify + done gate

- [ ] 5.1 FE gates green: `generate-routes`; `nx run-many -t typecheck lint test build` + prettier.
- [ ] 5.2 .NET gates green: `dotnet build` + `dotnet test` + `dotnet format --verify-no-changes`.
- [ ] 5.3 E2E (Playwright, live stack; `docker compose up -d --build` with the new `ollama` +
      exporter services): login; `/models` server-rendered with the installed-models list + GPU
      panel; the tile shows the model count; browser only hit `app.`/`keycloak.`; `api.` stays `404`.
      (Tolerate an empty model inventory — a fresh Ollama with nothing pulled is a valid `200`.)
- [ ] 5.4 Update `CLAUDE.md` (the `models` plugin + `Plugins:Models` + the self-hosted Ollama/GPU
      exporter notes + the asymmetric-degradation/GPU-non-fatal gotcha); mark complete; ready for
      `/opsx:archive`.

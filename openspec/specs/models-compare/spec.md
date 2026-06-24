# models-compare Specification

## Purpose
Let the user send one prompt to several Ollama models simultaneously and compare their responses
side-by-side, enabling quick qualitative evaluation of locally-available models.

## Requirements

### Requirement: Batch-inference endpoint

The `models` plugin SHALL expose `POST /api/models/compare` accepting
`{ prompt: string, models: string[] }` (1–8 model names, each must exist in Ollama's installed list).
The endpoint SHALL fan out to Ollama's `/api/generate` for each model concurrently and return
`[{ model, content, durationMs }]` once all complete (or each times out after 60 s).
A model that fails or times out returns `{ model, error: "<reason>", durationMs }` — partial success
is valid; all-failed returns `502`.

#### Scenario: Two models both respond

- **WHEN** the user sends `{ prompt: "Explain recursion", models: ["llama3.2", "mistral"] }`
- **THEN** the response is `200` with two entries, each containing the model name, its response
  text, and the wall-clock duration

#### Scenario: One model fails, one succeeds

- **WHEN** one model is unreachable but the other responds
- **THEN** the response is `200`; the failed model entry carries `error` instead of `content`

#### Scenario: All models fail

- **WHEN** all requested models time out or error
- **THEN** the response is `502`

#### Scenario: Too many models

- **WHEN** more than 8 model names are submitted
- **THEN** the response is `400 Bad Request`

### Requirement: Compare UI

The `models` page SHALL gain a **Compare** tab. The tab SHALL show:
- A multi-select of installed Ollama models (all from `/api/models`, not only running ones — Ollama
  will load them on demand)
- A `Textarea` for the shared prompt + a Run button
- A response grid: one card per model showing model name, response text, and duration badge
- While pending: a loading skeleton per card
- Each model card independently shows its error state if it failed

The compare call SHALL go through `createServerFn({ method: 'POST' })`.

#### Scenario: Side-by-side comparison renders

- **WHEN** the user selects two models and submits a prompt
- **THEN** two cards appear side by side, each populated with the respective model's response and
  duration once the endpoint returns

#### Scenario: No models installed

- **WHEN** Ollama has no installed models
- **THEN** the multi-select is disabled with a hint to pull a model via the Cookbook tab

### Requirement: Config-driven activation

The compare endpoint and tab SHALL activate with `Plugins:Models:Enabled` — no new config key.

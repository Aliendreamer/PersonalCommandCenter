# models-chat Specification

## Purpose
Add a streaming chat interface to the `models` plugin so the user can have multi-turn conversations
with any locally-running Ollama model directly from the PCC web shell.

## Requirements

### Requirement: Model-scoped chat endpoint

The `models` plugin SHALL expose `POST /api/models/chat` accepting `{ model, messages: [{role, content}] }`.
The endpoint SHALL proxy to Ollama's `/api/chat` with `stream: false` and return `{ role: "assistant", content }`.
Only models currently loaded in Ollama (`/api/ps`) are valid targets; an unknown model returns `400`.

#### Scenario: Chat with a loaded model

- **WHEN** the user POSTs `{ model: "llama3.2", messages: [{ role: "user", content: "Hello" }] }`
  and llama3.2 is loaded in Ollama
- **THEN** the response is `200` with `{ role: "assistant", content: "<reply>" }`

#### Scenario: Unknown model is rejected

- **WHEN** the user POSTs with a model name not present in Ollama's loaded list
- **THEN** the response is `400 Bad Request`

#### Scenario: Ollama unreachable degrades cleanly

- **WHEN** Ollama is unreachable
- **THEN** `POST /api/models/chat` returns `502`

### Requirement: Model selector + chat UI

The `models` page SHALL gain a **Chat** tab alongside the existing status view. The tab SHALL show:
- A `Select` to pick from currently-loaded models (populated from `/api/models`)
- A scrollable message thread (user bubbles right, assistant bubbles left)
- A `Textarea` + Send button; Enter submits, Shift+Enter inserts newline
- A Clear button to reset the thread

The chat SHALL go through `createServerFn({ method: 'POST' })` — the browser SHALL NOT call
core-api directly.

#### Scenario: Send a message

- **WHEN** the user selects a model, types a prompt, and presses Send
- **THEN** the message appears in the thread and the assistant reply appears below it after the response

#### Scenario: No model loaded

- **WHEN** no Ollama models are currently running
- **THEN** the model Select is disabled and a hint reads "Load a model in Ollama first"

### Requirement: Conversation history is client-local

Chat history SHALL be kept in React state only (no persistence, no server storage). Navigating away
clears the thread. Persistence is deferred to the `memory` plugin.

### Requirement: Config-driven activation

The chat endpoint and UI SHALL activate with the existing `Plugins:Models:Enabled` flag — no new
config key is needed.

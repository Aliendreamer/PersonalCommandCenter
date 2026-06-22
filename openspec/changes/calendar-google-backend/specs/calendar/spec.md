## ADDED Requirements

### Requirement: Google Calendar backend (config-credentialed, read + write)

The `calendar` plugin SHALL support a Google Calendar backend as a second read+write source alongside
CalDAV, enabled by config. Its credentials — OAuth client id, client secret, and a long-lived refresh
token — SHALL be supplied via configuration (secrets in `.env`), and the plugin SHALL mint short-lived
access tokens from the refresh token to call the Google Calendar API for the user's **primary**
calendar; there SHALL be no in-app OAuth linking flow and no persisted token store. When
`Plugins:Calendar:Google:Enabled` is false or any secret is blank, the Google backend SHALL be inert
and behaviour SHALL be exactly the existing CalDAV-only behaviour.

#### Scenario: Google events are read when enabled

- **WHEN** the Google backend is configured/enabled and the user lists calendar events for a window
- **THEN** the response includes the user's Google primary-calendar events for that window, with
  recurring events returned as concrete instances

#### Scenario: Disabled Google backend is inert

- **WHEN** `Plugins:Calendar:Google:Enabled` is false (or a secret is blank)
- **THEN** only CalDAV events are returned and no Google API call is made

### Requirement: Merged events carry a source and writes route to it

Calendar events SHALL each carry a `source` of `pcc` (CalDAV) or `google`, and the listing SHALL be the
merge of all enabled sources sorted by start. A create SHALL target a chosen calendar (`pcc` by
default, or `google`), and an update or delete SHALL act on the backend identified by the event's
`source` — events are never mirrored between backends.

#### Scenario: Listing merges both sources with their source tag

- **WHEN** both a PCC (CalDAV) event and a Google event fall in the window
- **THEN** the listing returns both, each tagged with its `source`, ordered by start

#### Scenario: A create targets the chosen calendar

- **WHEN** the user creates an event with the target calendar `google`
- **THEN** the event is created in Google Calendar and returned with `source: "google"`

#### Scenario: Edit/delete act on the owning backend

- **WHEN** the user edits or deletes an event whose `source` is `google`
- **THEN** the change is applied via the Google API (not CalDAV), and vice-versa for a `pcc` event

### Requirement: Per-source graceful degradation

The merged listing SHALL still return the other source's events when one calendar source fails (e.g.
Google is unconfigured, its token is revoked/expired, or its API errors) — a `200` with a degraded
indication for the failed source — and SHALL fail (`502`) only when **all** sources fail.

#### Scenario: Google failure degrades to PCC events

- **WHEN** the Google API call fails but CalDAV succeeds
- **THEN** the listing returns the CalDAV events with a degraded-Google indication, not an error

#### Scenario: All sources failing is an error

- **WHEN** every enabled source fails
- **THEN** the listing responds `502` and the UI shows the degraded calendar state

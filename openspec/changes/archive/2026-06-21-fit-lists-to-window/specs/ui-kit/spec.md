## ADDED Requirements

### Requirement: List pages fit the window with internal scroll

A plugin list page SHALL fit within the viewport rather than growing the page: the page wrapper SHALL
offer a `fill` mode that bounds the content to the available window height (below the app header) so
the page itself does not scroll, and the list content SHALL scroll within its own area. Server-side
rendering of the list content SHALL be preserved (the rows are present in the initial HTML).

#### Scenario: A long list scrolls inside the page, not the window

- **WHEN** a list page in `fill` mode renders more rows than fit the viewport
- **THEN** the page stays fixed to the window height and the list area scrolls internally

#### Scenario: The Notifications list is virtualized

- **WHEN** the Notifications list renders many rows
- **THEN** only the rows near the viewport are rendered (virtualized), and when no scroll height has
  been measured yet (server render / first paint) it renders all rows so the content is not blank

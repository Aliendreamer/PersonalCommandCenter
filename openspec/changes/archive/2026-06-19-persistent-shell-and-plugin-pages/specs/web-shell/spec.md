## ADDED Requirements

### Requirement: Persistent app shell on every authenticated page

The authenticated app SHALL render a persistent header and sidebar navigation on every page (not only
the dashboard). The header SHALL carry the account identity, theme toggle, and logout; the sidebar
SHALL list the enabled plugins. On small screens the sidebar SHALL collapse behind a toggle.

#### Scenario: Nav is present on a plugin page

- **WHEN** an authenticated user navigates to a plugin page (e.g. `/coding`)
- **THEN** the sidebar nav and the header are visible, the same as on the dashboard

#### Scenario: Nav lists enabled plugins everywhere

- **WHEN** any authenticated page is loaded
- **THEN** the sidebar shows a nav entry for each enabled plugin from the manifest

### Requirement: Active route is highlighted in the nav

The sidebar SHALL indicate the currently active route by highlighting its nav entry.

#### Scenario: Current page is marked active

- **WHEN** the user is on `/coding`
- **THEN** the "Coding" nav entry is shown in an active state and the others are not

### Requirement: Plugin pages render in a constrained, styled wrapper

Each plugin page SHALL render its content inside a shared wrapper that constrains the content width and
shows the page title, so content does not stretch the full viewport. Data-heavy pages SHALL present
their sections as cards.

#### Scenario: Plugin page content is width-constrained

- **WHEN** a plugin page renders on a wide viewport
- **THEN** its content is constrained to a readable column rather than spanning the full width

#### Scenario: Breakdown sections render as cards

- **WHEN** the coding or models page renders its breakdowns
- **THEN** each section is shown as a bordered card with aligned label·value rows

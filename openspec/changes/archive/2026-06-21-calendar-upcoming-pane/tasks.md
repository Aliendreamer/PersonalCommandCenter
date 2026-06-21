## 1. Upcoming filter (TDD) — DONE

- [x] 1.1 `lib/calendar.test`: `upcomingEvents(events, now)` keeps today + future, drops past, ascending
- [x] 1.2 Implemented `upcomingEvents` in `lib/calendar.ts`

## 2. Calendar page (upcoming pane + left-shift) — DONE

- [x] 2.1 Loader fetches a second forward window (today → +12 months) anchored to today, alongside the
  viewed-month window; returns `{ monthWindow, upcoming }`
- [x] 2.2 Right pane is an "Upcoming" `CalendarEventList` fed `upcomingEvents(...)`; create/edit form
  (seeded by selected day) + edit/delete kept
- [x] 2.3 Asymmetric layout: `Flex` row with the month calendar in a narrower left box (flex 5) and the
  upcoming list on the right (flex 7); stacks on small screens; calendar still highlights the selected day

## 3. Gates + deploy — DONE

- [x] 3.1 `pnpm typecheck`/`lint`/`test` (147 web + 17 contracts)/`build`/`format:check` green
- [x] 3.2 `pnpm fe:rebuild`

# Tasks: mail-gmail-folders

## Backend

- [ ] Add `Provider` and `FolderAliases` to `ImapOptions` in `MailOptions.cs`; add static `GmailAliases` dictionary
- [ ] Add `ResolveFolder(string)` helper to `ImapMailClient`; apply to every `OpenFolder`/`SelectFolder` call
- [ ] Write failing unit tests for `ResolveFolder` (generic IMAP, Gmail preset, user alias override)
- [ ] Write failing integration test: `GET /mail/messages?folder=Sent` with `Provider=gmail` asserts IMAP sees `[Gmail]/Sent Mail`
- [ ] Make tests pass
- [ ] Run `dotnet build && dotnet test && dotnet format --verify-no-changes` — all green

## Frontend

- [ ] No changes needed

## Gates

- [ ] `dotnet build` clean
- [ ] `dotnet test` all pass
- [ ] `dotnet format --verify-no-changes` clean
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` clean

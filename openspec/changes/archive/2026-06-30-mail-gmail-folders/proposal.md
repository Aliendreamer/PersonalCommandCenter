# Proposal: Gmail folder name mapping for the mail plugin

## Problem

Gmail exposes IMAP folders with non-standard names:
- `Sent` → `[Gmail]/Sent Mail`
- `Drafts` → `[Gmail]/Drafts`
- `Trash` → `[Gmail]/Trash`
- `All Mail` → `[Gmail]/All Mail`
- `Spam` → `[Gmail]/Spam`

The current `MailOptions.Folders` list defaults to `["INBOX", "Sent", "Drafts"]`.
With Gmail credentials, the sidebar shows those labels but the underlying IMAP
folders don't exist under those names — listing them returns an error or empty
result.

## Solution

Add an optional `FolderAliases` dictionary to `MailOptions` (display name → IMAP
folder name). When set, the IMAP client resolves the display name through the
alias map before issuing IMAP SELECT. A built-in Gmail preset populates the
common aliases so config is minimal.

## Non-goals

- OAuth2 / Google API authentication (App Passwords are sufficient)
- Push/IDLE real-time updates
- Label management (create/delete Gmail labels)

## Config example (`.env`)

```
Plugins__Mail__Imap__Host=imap.gmail.com
Plugins__Mail__Imap__Username=user@gmail.com
Plugins__Mail__Imap__Password=xxxx-xxxx-xxxx-xxxx
Plugins__Mail__Smtp__Host=smtp.gmail.com
Plugins__Mail__Smtp__Username=user@gmail.com
Plugins__Mail__Smtp__Password=xxxx-xxxx-xxxx-xxxx
Plugins__Mail__Provider=gmail
```

Setting `Provider=gmail` auto-populates `FolderAliases` with the Gmail mapping.
Custom `FolderAliases` entries always override the preset.

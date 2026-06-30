# Design: Gmail folder name mapping

## Backend changes

### `MailOptions` (mail.api/MailOptions.cs)

Add two fields to `ImapOptions`:

```csharp
public string? Provider { get; set; }                         // "gmail" | null
public Dictionary<string, string> FolderAliases { get; set; } = [];
```

A static `GmailAliases` dictionary lives on `MailOptions`:

```csharp
public static readonly Dictionary<string, string> GmailAliases = new()
{
    ["Sent"]     = "[Gmail]/Sent Mail",
    ["Drafts"]   = "[Gmail]/Drafts",
    ["Trash"]    = "[Gmail]/Trash",
    ["All Mail"] = "[Gmail]/All Mail",
    ["Spam"]     = "[Gmail]/Spam",
    ["Starred"]  = "[Gmail]/Starred",
};
```

When `Provider == "gmail"`, `ImapMailClient` merges `GmailAliases` with any
user-supplied `FolderAliases` (user entries win) to build the effective alias map.

### `ImapMailClient` (mail.api/ImapMailClient.cs)

Add a private helper:

```csharp
private string ResolveFolder(string displayName)
{
    var effective = _options.Imap.Provider?.ToLowerInvariant() == "gmail"
        ? MailOptions.GmailAliases
            .Concat(_options.Imap.FolderAliases)
            .ToDictionary(kv => kv.Key, kv => kv.Value)
        : _options.Imap.FolderAliases;

    return effective.TryGetValue(displayName, out var alias) ? alias : displayName;
}
```

Call `ResolveFolder(folder)` before every `OpenFolderAsync` / `SelectFolderAsync`.

### `appsettings.json`

No change needed — `Provider` and `FolderAliases` default to null/empty.
User sets via `.env`:

```
Plugins__Mail__Imap__Provider=gmail
```

## Frontend changes

None — the folder sidebar already displays the keys from `MailOptions.Folders`
(display names). Folder resolution is purely server-side.

## Tests

- `MailClientTests`: unit-test `ResolveFolder` with and without the Gmail preset
- `MailEndpointTests`: integration-test `GET /mail/messages?folder=Sent` with a
  fake IMAP client that asserts the resolved folder name is `[Gmail]/Sent Mail`
  when `Provider=gmail`

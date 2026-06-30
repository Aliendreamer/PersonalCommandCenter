namespace Pcc.Plugins.Mail;

public sealed class MailOptions
{
    public ImapOptions Imap { get; set; } = new();
    public SmtpOptions Smtp { get; set; } = new();
    public OllamaOptions Ollama { get; set; } = new();
    public string AiModel { get; set; } = "llama3.2";
    public string[] Tags { get; set; } = ["work", "personal", "newsletter", "finance", "travel"];
}

public sealed class ImapOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 993;
    public bool Ssl { get; set; } = true;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string[] Folders { get; set; } = ["INBOX", "Sent", "Drafts"];
    public string? Provider { get; set; }
    public Dictionary<string, string> FolderAliases { get; set; } = [];

    private static readonly Dictionary<string, string> GmailAliases = new()
    {
        ["Sent"] = "[Gmail]/Sent Mail",
        ["Drafts"] = "[Gmail]/Drafts",
        ["Trash"] = "[Gmail]/Trash",
        ["All Mail"] = "[Gmail]/All Mail",
        ["Spam"] = "[Gmail]/Spam",
        ["Starred"] = "[Gmail]/Starred",
    };

    public string Resolve(string displayName)
    {
        if (FolderAliases.TryGetValue(displayName, out var userAlias))
        {
            return userAlias;
        }

        if (Provider?.ToLowerInvariant() == "gmail" && GmailAliases.TryGetValue(displayName, out var gmailAlias))
        {
            return gmailAlias;
        }

        return displayName;
    }
}

public sealed class SmtpOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

public sealed class OllamaOptions
{
    public string BaseUrl { get; set; } = "http://ollama:11434";
}

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

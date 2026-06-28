namespace Pcc.Plugins.Mail;

public interface IOllamaMailClient
{
    Task<string> SummariseAsync(string body, CancellationToken ct);
    Task<string> DraftReplyAsync(string body, string from, string? instruction, CancellationToken ct);
    Task<string> TagAsync(string body, string[] tags, CancellationToken ct);
}

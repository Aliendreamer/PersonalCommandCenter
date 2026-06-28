using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Mail;

internal sealed class OllamaMailClient(HttpClient http, IOptions<MailOptions> opts) : IOllamaMailClient
{
    private readonly MailOptions _opts = opts.Value;

    public Task<string> SummariseAsync(string body, CancellationToken ct)
    {
        var prompt = $"Summarise this email in 3 bullet points:\n\n{body}";
        return GenerateAsync(prompt, ct);
    }

    public Task<string> DraftReplyAsync(string body, string from, string? instruction, CancellationToken ct)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"You are drafting a reply to an email from {from}.");
        sb.AppendLine("Match the sender's tone and writing style.");
        if (!string.IsNullOrWhiteSpace(instruction))
        {
            sb.AppendLine($"Additional instruction: {instruction}");
        }

        sb.AppendLine();
        sb.AppendLine("Original email:");
        sb.AppendLine(body);
        return GenerateAsync(sb.ToString(), ct);
    }

    public async Task<string> TagAsync(string body, string[] tags, CancellationToken ct)
    {
        var tagList = string.Join(", ", tags);
        var prompt = $"Classify this email into exactly one of these tags: {tagList}.\nRespond with only the tag name, nothing else.\n\nEmail:\n{body}";
        var response = await GenerateAsync(prompt, ct);
        // Parse the first word of the response as the tag
        var firstWord = response.Split([' ', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault() ?? tags[0];
        return firstWord.Trim().ToLowerInvariant();
    }

    private async Task<string> GenerateAsync(string prompt, CancellationToken ct)
    {
        var baseUrl = _opts.Ollama.BaseUrl.TrimEnd('/');
        var payload = new
        {
            model = _opts.AiModel,
            prompt,
            stream = false,
        };
        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");
        var response = await http.PostAsync($"{baseUrl}/api/generate", content, ct);
        response.EnsureSuccessStatusCode();
        using var doc = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        return doc.RootElement.GetProperty("response").GetString() ?? "";
    }
}

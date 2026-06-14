using System.Globalization;
using Microsoft.Extensions.Options;
using Pcc.Plugins;

namespace CoreApi.Notifications;

/// <summary>Bound from <c>Notifications:Ntfy</c>.</summary>
public sealed class NtfyOptions
{
    /// <summary>ntfy base URL (e.g. <c>http://ntfy:80</c>). Empty disables delivery.</summary>
    public string BaseUrl { get; set; } = "";

    public string Topic { get; set; } = "pcc";
}

/// <summary>Pushes a notification to ntfy. Throws on transport failure (the caller decides policy).</summary>
public interface INtfyClient
{
    Task PublishAsync(NotificationSeverity severity, string title, string? message, CancellationToken cancellationToken = default);
}

/// <summary>Posts to <c>{BaseUrl}/{Topic}</c> with the ntfy title/priority headers.</summary>
public sealed class NtfyClient(HttpClient http, IOptions<NtfyOptions> options) : INtfyClient
{
    private readonly NtfyOptions _options = options.Value;

    public async Task PublishAsync(
        NotificationSeverity severity,
        string title,
        string? message,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_options.BaseUrl))
        {
            return; // delivery not configured — no-op (the in-app notification still persists)
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            new Uri($"{_options.BaseUrl.TrimEnd('/')}/{_options.Topic}"))
        {
            Content = new StringContent(message ?? title),
        };
        request.Headers.TryAddWithoutValidation("Title", title);
        request.Headers.TryAddWithoutValidation("Priority", Priority(severity).ToString(CultureInfo.InvariantCulture));

        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private static int Priority(NotificationSeverity severity) => severity switch
    {
        NotificationSeverity.Error => 5,
        NotificationSeverity.Warning => 4,
        _ => 3,
    };
}

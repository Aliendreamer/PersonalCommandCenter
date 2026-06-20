using System.ServiceModel.Syndication;
using System.Xml;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Goodreads;

/// <summary>Reads a Goodreads shelf RSS feed and maps its (custom-element) book metadata.</summary>
public sealed class GoodreadsClient(HttpClient http, IOptions<GoodreadsOptions> options) : IGoodreadsClient
{
    private readonly GoodreadsOptions _options = options.Value;

    public async Task<IReadOnlyList<Book>> GetShelfAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_options.UserId))
        {
            throw new InvalidOperationException("Goodreads:UserId is not configured.");
        }

        var url = $"{_options.BaseUrl.TrimEnd('/')}/review/list_rss/{_options.UserId}?shelf={Uri.EscapeDataString(_options.Shelf)}";
        // Goodreads serves 403 to clients without a browser-like User-Agent, so set one explicitly.
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(url));
        request.Headers.UserAgent.ParseAdd("PersonalCommandCenter/1.0 (+https://github.com/PersonalCommandCenter)");
        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        // Buffer the response fully before parsing: SyndicationFeed reads the XmlReader synchronously,
        // and sync reads over a live HttpClient response stream are unreliable (they throw under the
        // container runtime). Reading into memory first also frees the connection during the parse.
        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        using var stream = new MemoryStream(bytes);
        using var reader = XmlReader.Create(stream);
        var feed = SyndicationFeed.Load(reader);

        return feed.Items.Select(item => new Book(
            item.Title?.Text ?? "",
            Extension(item, "author_name"),
            item.Links.FirstOrDefault()?.Uri?.ToString() ?? "",
            Extension(item, "book_large_image_url") ?? Extension(item, "book_image_url"),
            Extension(item, "book_description"),
            Double(item, "average_rating"),
            Int(item, "num_pages"),
            Int(item, "book_published")))
            .ToList();
    }

    // Goodreads carries book metadata in custom <item> elements (no namespace).
    private static string? Extension(SyndicationItem item, string name)
    {
        var ext = item.ElementExtensions.FirstOrDefault(e => string.Equals(e.OuterName, name, StringComparison.Ordinal));
        if (ext is null)
        {
            return null;
        }

        using var reader = ext.GetReader();
        var value = reader.ReadElementContentAsString();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static double? Double(SyndicationItem item, string name) =>
        double.TryParse(Extension(item, name), System.Globalization.CultureInfo.InvariantCulture, out var value)
            ? value
            : null;

    private static int? Int(SyndicationItem item, string name) =>
        int.TryParse(Extension(item, name), System.Globalization.CultureInfo.InvariantCulture, out var value)
            ? value
            : null;
}

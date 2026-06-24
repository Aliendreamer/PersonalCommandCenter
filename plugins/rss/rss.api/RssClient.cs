using System.Net;
using System.ServiceModel.Syndication;
using System.Text.RegularExpressions;
using System.Xml;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Rss;

/// <summary>Fetches each configured feed, tags items with the feed's topic, caps per topic.</summary>
public sealed partial class RssClient(HttpClient http, IOptions<RssOptions> options) : IFeedClient
{
    private readonly RssOptions _options = options.Value;

    public async Task<IReadOnlyList<RssItem>> GetItemsAsync(CancellationToken cancellationToken = default)
    {
        if (_options.Feeds.Length == 0)
        {
            throw new InvalidOperationException("Rss:Feeds is not configured.");
        }

        var perFeed = await Task.WhenAll(_options.Feeds.Select(feed => FetchOneAsync(feed, cancellationToken)));
        if (!perFeed.Any(items => items is not null))
        {
            throw new InvalidOperationException("All RSS feeds failed.");
        }

        return perFeed
            .Where(items => items is not null)
            .SelectMany(items => items!)
            .GroupBy(item => item.Topic)
            .SelectMany(group => group
                .OrderByDescending(item => item.Published)
                .Take(_options.MaxItemsPerTopic))
            .OrderByDescending(item => item.Published)
            .ToList();
    }

    // Returns null when the feed couldn't be fetched/parsed (skipped); an empty list = parsed, no items.
    private async Task<List<RssItem>?> FetchOneAsync(FeedConfig feed, CancellationToken cancellationToken)
    {
        try
        {
            // Buffer fully before parsing: SyndicationFeed reads synchronously, and sync reads over a
            // live HttpClient stream throw under the container runtime. Buffering frees the connection sooner.
            var bytes = await http.GetByteArrayAsync(new Uri(feed.Url), cancellationToken);
            using var stream = new MemoryStream(bytes);
            using var reader = XmlReader.Create(stream);
            var parsed = SyndicationFeed.Load(reader);
            var source = parsed.Title?.Text ?? feed.Url;

            return parsed.Items.Select(item => new RssItem(
                item.Title?.Text ?? "",
                item.Links.FirstOrDefault()?.Uri?.ToString() ?? "",
                item.PublishDate != default ? item.PublishDate : item.LastUpdatedTime,
                source,
                feed.Topic,
                StripHtml(item.Summary?.Text))).ToList();
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static string StripHtml(string? html)
    {
        if (string.IsNullOrEmpty(html))
        {
            return "";
        }

        var text = TagRegex().Replace(html, " ");
        text = WebUtility.HtmlDecode(text);
        return WhitespaceRegex().Replace(text, " ").Trim();
    }

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex TagRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();
}

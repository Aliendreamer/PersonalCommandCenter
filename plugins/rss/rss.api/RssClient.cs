using System.ServiceModel.Syndication;
using System.Xml;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Rss;

/// <summary>Fetches each configured feed, parses RSS/Atom, and aggregates newest-first.</summary>
public sealed class RssClient(HttpClient http, IOptions<RssOptions> options) : IFeedClient
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
            .OrderByDescending(item => item.Published)
            .Take(_options.MaxItems)
            .ToList();
    }

    // Returns null when the feed couldn't be fetched/parsed (skipped); an empty list = parsed, no items.
    private async Task<List<RssItem>?> FetchOneAsync(string feedUrl, CancellationToken cancellationToken)
    {
        try
        {
            // Buffer the response fully before parsing: SyndicationFeed reads the XmlReader
            // synchronously, and sync reads over a live HttpClient response stream are unreliable
            // (they throw under the container runtime). Buffering also frees the connection sooner.
            var bytes = await http.GetByteArrayAsync(new Uri(feedUrl), cancellationToken);
            using var stream = new MemoryStream(bytes);
            using var reader = XmlReader.Create(stream);
            var feed = SyndicationFeed.Load(reader);
            var source = feed.Title?.Text ?? feedUrl;

            return feed.Items.Select(item => new RssItem(
                item.Title?.Text ?? "",
                item.Links.FirstOrDefault()?.Uri?.ToString() ?? "",
                item.PublishDate != default ? item.PublishDate : item.LastUpdatedTime,
                source)).ToList();
        }
        catch (Exception)
        {
            return null;
        }
    }
}

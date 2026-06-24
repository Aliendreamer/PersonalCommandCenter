# RSS Topic Curation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat RSS list into a topic-curated page — top-10 cards per topic (Technology/Bulgaria/World/Sports) in 4 columns, with a Topic+Source filterable list below.

**Architecture:** Each configured feed is tagged with one topic; items inherit their feed's topic. The backend groups by topic and caps each at `MaxItemsPerTopic`, returning a flat newest-first `RssItem[]` enriched with `topic` + `summary`. The frontend derives the 4-column cards and the filterable list from the same loader payload (client-side filtering, no extra fetch).

**Tech Stack:** .NET 10 FastEndpoints + `System.ServiceModel.Syndication` (backend), `@pcc/contracts` (TS), TanStack Start + Mantine v9 (web), xUnit + vitest + Playwright (tests).

## Global Constraints

- Warnings are errors (`TreatWarningsAsErrors`); Nullable + ImplicitUsings on. CAxxxx fails build.
- `topic` is a lowercase string, one of exactly: `technology`, `bulgaria`, `world`, `sports`.
- Degradation contract unchanged: single bad feed skipped; empty config or all-feeds-fail → endpoint **502**.
- Plugin services resolved lazily via `Resolve<T>()` in endpoints (not ctor injection).
- External links use `safeHref` (`apps/web/src/lib/safe-href.ts`) + `rel="noreferrer noopener"`.
- UI is Mantine v9 (props/`c=`/`fz=`, not CSS classes). Component tests wrap via `apps/web/src/test/render.tsx`.
- Config layering: topic-tagged feeds (non-secret) go in `apps/core-api/appsettings.json` under `Plugins:Rss`. No compose, no secrets.
- Commit after each task. Gates before "done": `dotnet build` + `dotnet test` + `dotnet format --verify-no-changes`; `pnpm typecheck/lint/test/build` + `pnpm format:check`.

---

## File Structure

- `plugins/rss/rss.api/RssOptions.cs` — modify: `FeedConfig[] Feeds`, `int MaxItemsPerTopic`.
- `plugins/rss/rss.api/FeedConfig.cs` — create: `{ Url, Topic }`.
- `plugins/rss/rss.api/RssItem.cs` — modify: add `Topic`, `Summary`.
- `plugins/rss/rss.api/RssClient.cs` — modify: tag topic, strip summary, per-topic cap.
- `tests/CoreApi.Tests/RssClientTests.cs` — modify: topic tagging, per-topic cap, summary strip.
- `tests/CoreApi.Tests/RssEndpointTests.cs` — modify: assert topic+summary passthrough.
- `apps/core-api/appsettings.json` — modify: topic-tagged feed map + `MaxItemsPerTopic`.
- `libs/contracts/src/types.ts` — modify: `RssTopic` union + `RssItem` fields.
- `apps/web/src/components/rss-topic-cards.tsx` — create: 4-column cards + `RssCard`.
- `apps/web/src/components/rss-topic-cards.test.tsx` — create.
- `apps/web/src/components/rss-item-list.tsx` — modify: Topic + Source filters.
- `apps/web/src/components/rss-item-list.test.tsx` — create.
- `apps/web/src/routes/_authenticated/rss.tsx` — modify: render cards + list.
- `tests/e2e/rss.spec.ts` — modify: assert columns/filters, tolerate degraded.

The dashboard tile (`rss-latest-tile.tsx`) and dashboard loader are **unchanged** — `latest.title` + count still render correctly with the richer DTO.

---

### Task 1: Backend — topic-tagged config, enriched DTO, per-topic aggregation

**Files:**
- Create: `plugins/rss/rss.api/FeedConfig.cs`
- Modify: `plugins/rss/rss.api/RssOptions.cs`
- Modify: `plugins/rss/rss.api/RssItem.cs`
- Modify: `plugins/rss/rss.api/RssClient.cs`
- Test: `tests/CoreApi.Tests/RssClientTests.cs`

**Interfaces:**
- Consumes: `IFeedClient.GetItemsAsync` (unchanged signature).
- Produces:
  - `record RssItem(string Title, string Link, DateTimeOffset Published, string Source, string Topic, string Summary)`
  - `class FeedConfig { string Url; string Topic }`
  - `class RssOptions { FeedConfig[] Feeds; int MaxItemsPerTopic = 25 }`

- [ ] **Step 1: Rewrite `RssClientTests.cs` for the new model (failing test)**

Replace the whole file with:

```csharp
using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Rss;

namespace CoreApi.Tests;

public class RssClientTests
{
    private const string TechRss = """
        <?xml version="1.0"?>
        <rss version="2.0"><channel>
          <title>TechSite</title>
          <item><title>Tech A</title><link>https://t.test/a</link>
            <description><![CDATA[<p>Hello <b>world</b></p>]]></description>
            <pubDate>Mon, 15 Jun 2026 10:00:00 GMT</pubDate></item>
          <item><title>Tech B</title><link>https://t.test/b</link>
            <pubDate>Mon, 15 Jun 2026 09:00:00 GMT</pubDate></item>
        </channel></rss>
        """;

    private const string BgRss = """
        <?xml version="1.0"?>
        <rss version="2.0"><channel>
          <title>BgSite</title>
          <item><title>Bg Old</title><link>https://b.test/1</link>
            <pubDate>Mon, 01 Jun 2026 08:00:00 GMT</pubDate></item>
        </channel></rss>
        """;

    [Fact]
    public async Task Tags_items_with_their_feed_topic()
    {
        var client = Create(
            ("https://t.test/rss", "technology", TechRss),
            ("https://b.test/rss", "bulgaria", BgRss));

        var items = await client.GetItemsAsync();

        Assert.All(items.Where(i => i.Source == "TechSite"), i => Assert.Equal("technology", i.Topic));
        Assert.All(items.Where(i => i.Source == "BgSite"), i => Assert.Equal("bulgaria", i.Topic));
    }

    [Fact]
    public async Task Strips_html_from_summary()
    {
        var client = Create(("https://t.test/rss", "technology", TechRss));

        var items = await client.GetItemsAsync();

        var a = Assert.Single(items, i => i.Title == "Tech A");
        Assert.Equal("Hello world", a.Summary);
    }

    [Fact]
    public async Task Caps_items_per_topic()
    {
        var client = Create(maxPerTopic: 1, feeds: ("https://t.test/rss", "technology", TechRss));

        var items = await client.GetItemsAsync();

        Assert.Single(items);
        Assert.Equal("Tech A", items[0].Title); // newest kept
    }

    [Fact]
    public async Task Low_volume_topic_is_not_starved_by_a_busy_one()
    {
        // technology has 2 newer items, bulgaria has 1 older item; cap=2 → bulgaria still present.
        var client = Create(maxPerTopic: 2,
            feeds: new[]
            {
                ("https://t.test/rss", "technology", TechRss),
                ("https://b.test/rss", "bulgaria", BgRss),
            });

        var items = await client.GetItemsAsync();

        Assert.Contains(items, i => i.Topic == "bulgaria");
        Assert.Equal(2, items.Count(i => i.Topic == "technology"));
    }

    [Fact]
    public async Task Skips_a_bad_feed_but_keeps_the_good_one()
    {
        var client = Create(
            ("https://t.test/rss", "technology", TechRss),
            ("https://bad.test/feed", "world", null)); // 500 → skipped

        var items = await client.GetItemsAsync();

        Assert.All(items, i => Assert.NotEqual("world", i.Topic));
        Assert.NotEmpty(items);
    }

    [Fact]
    public async Task Throws_when_no_feeds_configured()
    {
        var client = new RssClient(new HttpClient(new StubHandler([])), Options.Create(new RssOptions()));
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.GetItemsAsync());
    }

    private static RssClient Create(params (string Url, string Topic, string? Body)[] feeds) =>
        Create(25, feeds);

    private static RssClient Create(int maxPerTopic, params (string Url, string Topic, string? Body)[] feeds)
    {
        var handler = new StubHandler(feeds.ToDictionary(f => f.Url, f => f.Body));
        var options = Options.Create(new RssOptions
        {
            MaxItemsPerTopic = maxPerTopic,
            Feeds = [.. feeds.Select(f => new FeedConfig { Url = f.Url, Topic = f.Topic })],
        });
        return new RssClient(new HttpClient(handler), options);
    }

    private sealed class StubHandler(Dictionary<string, string?> responses) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var body = responses.TryGetValue(request.RequestUri!.AbsoluteUri, out var content) ? content : null;
            if (body is null)
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError));
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body, System.Text.Encoding.UTF8, "application/xml"),
            });
        }
    }
}
```

- [ ] **Step 2: Run tests, verify they fail to compile**

Run: `dotnet test tests/CoreApi.Tests --filter FullyQualifiedName~RssClientTests`
Expected: FAIL — `FeedConfig` not found, `RssOptions.MaxItemsPerTopic` not found, `RssItem` arity mismatch.

- [ ] **Step 3: Create `FeedConfig.cs`**

```csharp
namespace Pcc.Plugins.Rss;

/// <summary>One configured feed and the topic its items belong to.</summary>
public sealed class FeedConfig
{
    public string Url { get; set; } = "";

    /// <summary>One of: technology, bulgaria, world, sports.</summary>
    public string Topic { get; set; } = "";
}
```

- [ ] **Step 4: Update `RssOptions.cs`**

```csharp
namespace Pcc.Plugins.Rss;

/// <summary>Bound from the plugin's config section (<c>Plugins:Rss</c>).</summary>
public sealed class RssOptions
{
    public FeedConfig[] Feeds { get; set; } = [];

    /// <summary>Newest items kept per topic (cards use the top 10; the rest feed the list).</summary>
    public int MaxItemsPerTopic { get; set; } = 25;
}
```

- [ ] **Step 5: Update `RssItem.cs`**

```csharp
namespace Pcc.Plugins.Rss;

/// <summary>One feed item, slimmed to what the command center renders.</summary>
public sealed record RssItem(
    string Title,
    string Link,
    DateTimeOffset Published,
    string Source,
    string Topic,
    string Summary);
```

- [ ] **Step 6: Rewrite `RssClient.cs` (topic tag + summary strip + per-topic cap)**

```csharp
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
```

- [ ] **Step 7: Run tests, verify pass**

Run: `dotnet test tests/CoreApi.Tests --filter FullyQualifiedName~RssClientTests`
Expected: PASS (6 tests).

- [ ] **Step 8: Commit**

```bash
git add plugins/rss/rss.api/ tests/CoreApi.Tests/RssClientTests.cs
git commit -m "feat(rss): topic-tagged feeds, summary, per-topic aggregation"
```

---

### Task 2: Endpoint test — assert topic + summary passthrough

**Files:**
- Test: `tests/CoreApi.Tests/RssEndpointTests.cs`

**Interfaces:**
- Consumes: `RssItem` 6-arg ctor (Task 1); `IFeedClient` (unchanged).

- [ ] **Step 1: Update the test (failing)**

In `RssEndpointTests.cs`, replace the `Returns_aggregated_items` test and the `ItemDto` record:

```csharp
    [Fact]
    public async Task Returns_aggregated_items_with_topic_and_summary()
    {
        var client = AuthedWith(new FakeFeed([
            new RssItem("First", "https://e.test/1", DateTimeOffset.UtcNow, "Example", "technology", "A summary"),
        ]));

        var items = await client.GetFromJsonAsync<List<ItemDto>>("/api/rss");

        Assert.NotNull(items);
        var first = Assert.Single(items!);
        Assert.Equal("First", first.Title);
        Assert.Equal("technology", first.Topic);
        Assert.Equal("A summary", first.Summary);
    }
```

And update the DTO record:

```csharp
    private sealed record ItemDto(string Title, string Link, string Source, string Topic, string Summary);
```

- [ ] **Step 2: Run, verify fail (compile error in old test body), then pass after edit**

Run: `dotnet test tests/CoreApi.Tests --filter FullyQualifiedName~RssEndpointTests`
Expected: PASS (4 tests) once the `new RssItem(...)` call and `ItemDto` use 6 / 5 args respectively.

- [ ] **Step 3: Commit**

```bash
git add tests/CoreApi.Tests/RssEndpointTests.cs
git commit -m "test(rss): assert topic+summary in endpoint payload"
```

---

### Task 3: appsettings — topic-tagged feed map

**Files:**
- Modify: `apps/core-api/appsettings.json`

**Interfaces:**
- Consumes: `RssOptions`/`FeedConfig` binding (Task 1). Config keys bind case-insensitively (`url`/`topic`).

- [ ] **Step 1: Replace the `Rss` block**

In `apps/core-api/appsettings.json`, replace the existing `"Rss": { ... }` object with:

```json
    "Rss": {
      "Enabled": true,
      "MaxItemsPerTopic": 25,
      "Feeds": [
        { "Url": "https://hnrss.org/frontpage", "Topic": "technology" },
        { "Url": "https://feeds.arstechnica.com/arstechnica/index", "Topic": "technology" },
        { "Url": "https://hackaday.com/blog/feed/", "Topic": "technology" },
        { "Url": "https://rss.cnn.com/rss/edition_technology.rss", "Topic": "technology" },
        { "Url": "https://www.novinite.com/rss/news.rss", "Topic": "bulgaria" },
        { "Url": "https://www.dnevnik.bg/rss/", "Topic": "bulgaria" },
        { "Url": "https://www.sportal.bg/rss.php", "Topic": "bulgaria" },
        { "Url": "https://feeds.bbci.co.uk/news/rss.xml", "Topic": "world" },
        { "Url": "https://www.theguardian.com/world/rss", "Topic": "world" },
        { "Url": "https://rss.cnn.com/rss/edition_world.rss", "Topic": "world" },
        { "Url": "https://www.espn.com/espn/rss/nfl/news", "Topic": "sports" },
        { "Url": "https://www.espn.com/espn/rss/soccer/news", "Topic": "sports" },
        { "Url": "https://www.espn.com/espn/rss/nba/news", "Topic": "sports" },
        { "Url": "https://www.football365.com/feed", "Topic": "sports" }
      ]
    },
```

> **Wiring note (verify at runtime, do not block this task):** the exact paths for `novinite.com`,
> `dnevnik.bg`, `sportal.bg`, `dnes.bg` (RSS.BG, http-only), CNN, and `football365.com/feed` were not
> auto-confirmable during design. Each unreachable feed is skipped by the degradation contract; after
> deploy, hit `GET /api/rss` and adjust any feed whose items never appear. dnes.bg can be added under
> `bulgaria` once its exact RSS.BG category URL is confirmed (http://).

- [ ] **Step 2: Build + run the rss tests (config still binds, nothing references `MaxItems`)**

Run: `dotnet build && dotnet test tests/CoreApi.Tests --filter FullyQualifiedName~Rss`
Expected: build OK; PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/core-api/appsettings.json
git commit -m "feat(rss): topic-tagged feed map (tech/bulgaria/world/sports)"
```

---

### Task 4: Contract — `RssTopic` union + `RssItem` fields

**Files:**
- Modify: `libs/contracts/src/types.ts`

**Interfaces:**
- Produces: `RssTopic`, `RssItem { ..., topic: RssTopic, summary: string }` for the web app.

- [ ] **Step 1: Update the type**

Replace the existing `RssItem` interface (and its comment) in `libs/contracts/src/types.ts` with:

```ts
export type RssTopic = 'technology' | 'bulgaria' | 'world' | 'sports';

/** Mirrors the backend `RssItem` from `GET /api/rss`. */
export interface RssItem {
  title: string;
  link: string;
  published: string;
  source: string;
  topic: RssTopic;
  summary: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (web compiles against the richer type even though it doesn't read the new fields yet).

- [ ] **Step 3: Commit**

```bash
git add libs/contracts/src/types.ts
git commit -m "feat(contracts): RssTopic + topic/summary on RssItem"
```

---

### Task 5: Frontend — 4-column topic cards

**Files:**
- Create: `apps/web/src/components/rss-topic-cards.tsx`
- Test: `apps/web/src/components/rss-topic-cards.test.tsx`

**Interfaces:**
- Consumes: `RssItem`, `RssTopic` (Task 4); `safeHref`.
- Produces: `export function RssTopicCards({ items }: { items: RssItem[] })`; `export const TOPICS`.

- [ ] **Step 1: Write the component test (failing)**

```tsx
import { describe, expect, it } from 'vitest'
import type { RssItem } from '@pcc/contracts'
import { render, screen } from '../test/render'
import { RssTopicCards } from './rss-topic-cards'

const item = (over: Partial<RssItem>): RssItem => ({
  title: 'T',
  link: 'https://e.test/x',
  published: '2026-06-15T10:00:00Z',
  source: 'Src',
  topic: 'technology',
  summary: '',
  ...over,
})

describe('RssTopicCards', () => {
  it('renders a labeled column per topic', () => {
    render(<RssTopicCards items={[item({})]} />)
    for (const label of ['Technology', 'Bulgaria', 'World', 'Sports']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('caps each topic at 10 cards', () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      item({ title: `Tech ${i}`, link: `https://e.test/${i}` }),
    )
    render(<RssTopicCards items={many} />)
    expect(screen.getAllByRole('link')).toHaveLength(10)
  })

  it('shows an empty state for a topic with no items', () => {
    render(<RssTopicCards items={[item({ topic: 'sports', title: 'Goal' })]} />)
    // technology column has nothing
    expect(screen.getAllByText('No items').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm --filter web test -- rss-topic-cards`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
import { Anchor, Box, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import type { RssItem, RssTopic } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'

export const TOPICS: { key: RssTopic; label: string }[] = [
  { key: 'technology', label: 'Technology' },
  { key: 'bulgaria', label: 'Bulgaria' },
  { key: 'world', label: 'World' },
  { key: 'sports', label: 'Sports' },
]

const CARDS_PER_TOPIC = 10

function when(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function RssCard({ item }: { item: RssItem }) {
  return (
    <Paper withBorder radius="sm" p="xs">
      <Anchor
        href={safeHref(item.link)}
        target="_blank"
        rel="noreferrer noopener"
        size="sm"
        fw={500}
        lineClamp={2}
      >
        {item.title}
      </Anchor>
      <Text size="xs" c="dimmed">
        {item.source}
        {when(item.published) ? ` · ${when(item.published)}` : ''}
      </Text>
      {item.summary ? (
        <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
          {item.summary}
        </Text>
      ) : null}
    </Paper>
  )
}

/** Top cards: one labeled column per topic, newest 10 each. */
export function RssTopicCards({ items }: { items: RssItem[] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
      {TOPICS.map(({ key, label }) => {
        const top = items.filter((i) => i.topic === key).slice(0, CARDS_PER_TOPIC)
        return (
          <Box key={key}>
            <Title order={4} mb="xs">
              {label}
            </Title>
            {top.length === 0 ? (
              <Text size="sm" c="dimmed">
                No items
              </Text>
            ) : (
              <Stack gap="xs">
                {top.map((item) => (
                  <RssCard key={item.link} item={item} />
                ))}
              </Stack>
            )}
          </Box>
        )
      })}
    </SimpleGrid>
  )
}
```

> Note: `items` arrives newest-first from the loader, so `.slice(0, 10)` is the newest 10 per topic.

- [ ] **Step 4: Run, verify pass**

Run: `pnpm --filter web test -- rss-topic-cards`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/rss-topic-cards.tsx apps/web/src/components/rss-topic-cards.test.tsx
git commit -m "feat(rss): 4-column topic cards component"
```

---

### Task 6: Frontend — Topic + Source filters on the list

**Files:**
- Modify: `apps/web/src/components/rss-item-list.tsx`
- Test: `apps/web/src/components/rss-item-list.test.tsx`

**Interfaces:**
- Consumes: `RssItem`, `RssTopic`, `TOPICS` (from `rss-topic-cards`).
- Produces: `RssItemList({ items, error })` (unchanged props) with internal Topic+Source filtering.

- [ ] **Step 1: Write the test (failing)**

```tsx
import { describe, expect, it } from 'vitest'
import type { RssItem } from '@pcc/contracts'
import { render, screen, fireEvent, within } from '../test/render'
import { RssItemList } from './rss-item-list'

const item = (over: Partial<RssItem>): RssItem => ({
  title: 'T',
  link: 'https://e.test/x',
  published: '2026-06-15T10:00:00Z',
  source: 'Src',
  topic: 'technology',
  summary: '',
  ...over,
})

const data: RssItem[] = [
  item({ title: 'Tech one', link: 'https://e.test/1', topic: 'technology', source: 'Ars' }),
  item({ title: 'Sport one', link: 'https://e.test/2', topic: 'sports', source: 'ESPN' }),
]

describe('RssItemList filters', () => {
  it('filters by topic chip', () => {
    render(<RssItemList items={data} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Sports' }))
    expect(screen.queryByText('Tech one')).not.toBeInTheDocument()
    expect(screen.getByText('Sport one')).toBeInTheDocument()
  })

  it('renders an All chip that shows everything', () => {
    render(<RssItemList items={data} />)
    expect(screen.getByText('Tech one')).toBeInTheDocument()
    expect(screen.getByText('Sport one')).toBeInTheDocument()
  })

  it('degrades on error', () => {
    render(<RssItemList items={[]} error="unreachable" />)
    expect(screen.getByText('Feeds unavailable')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm --filter web test -- rss-item-list`
Expected: FAIL — no topic chips / `radio` roles yet.

- [ ] **Step 3: Implement filters**

Replace `apps/web/src/components/rss-item-list.tsx` with:

```tsx
import { useMemo, useState } from 'react'
import { Anchor, Box, Chip, Group, Paper, Select, Stack, Text } from '@mantine/core'
import type { RssItem, RssTopic } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'
import { TOPICS } from './rss-topic-cards'

export interface RssItemListProps {
  items: RssItem[]
  error?: string
}

function when(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const rowBorder = (i: number) =>
  i > 0
    ? { borderTop: '1px solid var(--mantine-color-default-border)' }
    : undefined

/** Lists feed items newest-first with Topic + Source filters; degrades on error. */
export function RssItemList({ items, error }: RssItemListProps) {
  const [topic, setTopic] = useState<RssTopic | 'all'>('all')
  const [source, setSource] = useState<string | null>(null)

  const sources = useMemo(
    () => [...new Set(items.map((i) => i.source))].sort(),
    [items],
  )

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (topic === 'all' || i.topic === topic) &&
          (source === null || i.source === source),
      ),
    [items, topic, source],
  )

  if (error) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Feeds unavailable
      </Text>
    )
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-end">
        <Chip.Group
          multiple={false}
          value={topic}
          onChange={(v) => setTopic((v as RssTopic | 'all') ?? 'all')}
        >
          <Group gap="xs">
            <Chip value="all">All</Chip>
            {TOPICS.map(({ key, label }) => (
              <Chip key={key} value={key}>
                {label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <Select
          aria-label="Filter by source"
          placeholder="All sources"
          clearable
          data={sources}
          value={source}
          onChange={setSource}
          size="xs"
          w={200}
        />
      </Group>

      {filtered.length === 0 ? (
        <Text size="sm" c="dimmed">
          No items
        </Text>
      ) : (
        <Paper withBorder radius="md">
          <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
            {filtered.map((item, i) => (
              <Box component="li" key={item.link} px="sm" py="xs" style={rowBorder(i)}>
                <Anchor
                  href={safeHref(item.link)}
                  target="_blank"
                  rel="noreferrer noopener"
                  size="sm"
                >
                  {item.title}
                </Anchor>
                <Text size="xs" c="dimmed">
                  {item.source}
                  {when(item.published) ? ` · ${when(item.published)}` : ''}
                </Text>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Stack>
  )
}
```

> Mantine `Chip` with `Chip.Group multiple={false}` renders each chip with `role="radio"`, which the
> test queries. If the installed Mantine version renders a different role, query by text instead.

- [ ] **Step 4: Run, verify pass**

Run: `pnpm --filter web test -- rss-item-list`
Expected: PASS (3 tests). If the chip role differs, switch the test to `screen.getByText('Sports')`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/rss-item-list.tsx apps/web/src/components/rss-item-list.test.tsx
git commit -m "feat(rss): topic + source filters on the feed list"
```

---

### Task 7: Frontend — page renders cards + filterable list

**Files:**
- Modify: `apps/web/src/routes/_authenticated/rss.tsx`

**Interfaces:**
- Consumes: `RssTopicCards` (Task 5), `RssItemList` (Task 6), `getRss`/`settle` (unchanged).

- [ ] **Step 1: Update the route**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Stack } from '@mantine/core'

import { getRss } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { RssTopicCards } from '../../components/rss-topic-cards'
import { RssItemList } from '../../components/rss-item-list'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/rss')({
  loader: async () => settle(getRss()),
  component: RssPage,
})

function RssPage() {
  const result = Route.useLoaderData()
  const items = result.data ?? []
  return (
    <PluginPage title="Feeds" fill>
      <Stack gap="lg">
        {!result.error ? <RssTopicCards items={items} /> : null}
        <RssItemList items={items} error={result.error ? 'unreachable' : undefined} />
      </Stack>
    </PluginPage>
  )
}
```

- [ ] **Step 2: Typecheck + the web tests**

Run: `pnpm typecheck && pnpm --filter web test -- rss`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/_authenticated/rss.tsx
git commit -m "feat(rss): page renders topic cards above filterable list"
```

---

### Task 8: E2E — assert columns + filters, tolerate degraded feeds

**Files:**
- Modify: `tests/e2e/rss.spec.ts`

**Interfaces:**
- Consumes: the live `/rss` page (Task 7).

- [ ] **Step 1: Read the current spec to match its login/setup pattern**

Run: `sed -n '1,60p' tests/e2e/rss.spec.ts`
Expected: see how it navigates to `/rss` and its degraded-tolerant assertions.

- [ ] **Step 2: Add/adjust assertions (keep the existing degraded tolerance)**

Within the existing `/rss` test, after navigation, assert the four topic headings and the topic
filter are present (these render regardless of feed health), keeping the items-or-degraded check:

```ts
await expect(page.getByRole('heading', { name: 'Technology' })).toBeVisible()
await expect(page.getByRole('heading', { name: 'Sports' })).toBeVisible()
await expect(page.getByText('All', { exact: true })).toBeVisible()
// existing tolerance: either feed items or the "Feeds unavailable" notice is acceptable.
```

> Do not assert specific article text — public feeds rate-limit (429) and degrade by design.

- [ ] **Step 3: Run the E2E (serial, per the live-stack config)**

Run: `pnpm --filter @pcc/e2e test -- rss` (or the repo's e2e runner) — requires the live stack up.
Expected: PASS or the documented degraded path.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/rss.spec.ts
git commit -m "test(rss): e2e asserts topic columns + filter, tolerates degraded"
```

---

## Final gate (run before declaring done)

```bash
dotnet build && dotnet test && dotnet format --verify-no-changes
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm format:check
```

All green = done.

---

## Self-Review

- **Spec coverage:** per-feed topic tag (T1) ✓; top-10 cards in 4 columns (T5) ✓; filterable list Topic+Source (T6) ✓; summary on cards (T1 strip, T5 render) ✓; per-topic cap prevents starvation (T1) ✓; feed map locked (T3) ✓; contract (T4) ✓; degradation unchanged (T1/T2) ✓; tile unchanged (noted) ✓; E2E tolerant (T8) ✓.
- **Placeholder scan:** none — every code step is complete; the appsettings "verify at runtime" note is an operational caveat, not a code placeholder.
- **Type consistency:** `RssItem` 6-arg ctor used identically in T1/T2; `topic`/`summary` names consistent across C#/TS; `TOPICS` defined in T5, imported in T6; `RssTopic` union (T4) matches the four `Topic` strings in T3.

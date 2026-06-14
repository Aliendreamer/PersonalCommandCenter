using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Tasks;

namespace CoreApi.Tests;

public class TaskDavClientTests
{
    private static TaskOptions Options() => new()
    {
        BaseUrl = "http://radicale.test:5232",
        Collection = "/pcc/tasks/",
        Username = "pcc",
        Password = "secret",
    };

    private const string Multistatus = """
        <multistatus xmlns="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <response><propstat><prop><c:calendar-data>BEGIN:VCALENDAR
        BEGIN:VTODO
        UID:open
        SUMMARY:Open
        STATUS:NEEDS-ACTION
        END:VTODO
        END:VCALENDAR</c:calendar-data></prop></propstat></response>
          <response><propstat><prop><c:calendar-data>BEGIN:VCALENDAR
        BEGIN:VTODO
        UID:done
        SUMMARY:Done
        STATUS:COMPLETED
        END:VTODO
        END:VCALENDAR</c:calendar-data></prop></propstat></response>
        </multistatus>
        """;

    [Fact]
    public async Task List_reports_vtodo_and_excludes_completed_by_default()
    {
        var handler = new StubHandler((_, _) =>
            new HttpResponseMessage((HttpStatusCode)207) { Content = new StringContent(Multistatus) });
        var client = new TaskDavClient(new HttpClient(handler), Microsoft.Extensions.Options.Options.Create(Options()));

        var open = await client.ListAsync(includeCompleted: false);
        var all = await client.ListAsync(includeCompleted: true);

        var report = handler.Requests.First(r => r.Method.Method == "REPORT");
        Assert.Equal("http://radicale.test:5232/pcc/tasks/", report.Uri);
        Assert.Equal("Basic", report.AuthScheme);
        Assert.Equal("open", Assert.Single(open).Uid);
        Assert.Equal(2, all.Count);
    }

    [Fact]
    public async Task Create_succeeds_when_the_collection_already_exists()
    {
        var handler = new StubHandler((req, _) => new HttpResponseMessage(
            req.Method.Method == "MKCALENDAR" ? HttpStatusCode.Conflict : HttpStatusCode.Created));
        var client = new TaskDavClient(new HttpClient(handler), Microsoft.Extensions.Options.Options.Create(Options()));

        var created = await client.CreateAsync(new TodoInput("Demo"));

        Assert.False(string.IsNullOrEmpty(created.Uid));
        var put = Assert.Single(handler.Requests, r => r.Method == HttpMethod.Put);
        Assert.EndsWith($"{created.Uid}.ics", put.Uri, StringComparison.Ordinal);
        Assert.Contains("VTODO", put.Body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Delete_returns_false_on_404()
    {
        var handler = new StubHandler((_, _) => new HttpResponseMessage(HttpStatusCode.NotFound));
        var client = new TaskDavClient(new HttpClient(handler), Microsoft.Extensions.Options.Options.Create(Options()));

        Assert.False(await client.DeleteAsync("nope"));
    }

    private sealed record Captured(HttpMethod Method, string Uri, string? AuthScheme, string Body);

    private sealed class StubHandler(Func<HttpRequestMessage, CancellationToken, HttpResponseMessage> respond)
        : HttpMessageHandler
    {
        public List<Captured> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
            Requests.Add(new Captured(
                request.Method,
                request.RequestUri!.AbsoluteUri,
                request.Headers.Authorization?.Scheme,
                body));
            return respond(request, cancellationToken);
        }
    }
}

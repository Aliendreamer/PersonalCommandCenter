using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Tasks;

/// <summary>Talks CalDAV to the configured collection (e.g. Radicale) and maps VTODOs.</summary>
public sealed class TaskDavClient : ITaskClient
{
    private static readonly XNamespace Caldav = "urn:ietf:params:xml:ns:caldav";
    private static readonly HttpMethod Report = new("REPORT");
    private static readonly HttpMethod MkCalendar = new("MKCALENDAR");

    private readonly HttpClient _http;
    private readonly TaskOptions _options;

    public TaskDavClient(HttpClient http, IOptions<TaskOptions> options)
    {
        _http = http;
        _options = options.Value;
        if (string.IsNullOrEmpty(_options.BaseUrl))
        {
            throw new InvalidOperationException("Tasks:BaseUrl is not configured.");
        }

        var credentials = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_options.Username}:{_options.Password}"));
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
    }

    private Uri CollectionUri => new($"{_options.BaseUrl.TrimEnd('/')}/{_options.Collection.Trim('/')}/");

    private Uri TodoUri(string uid) => new(CollectionUri, $"{uid}.ics");

    public async Task<IReadOnlyList<TodoItem>> ListAsync(bool includeCompleted, CancellationToken cancellationToken = default)
    {
        const string body = """
            <?xml version="1.0" encoding="utf-8"?>
            <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
              <d:prop><d:getetag/><c:calendar-data/></d:prop>
              <c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VTODO"/></c:comp-filter></c:filter>
            </c:calendar-query>
            """;

        using var request = new HttpRequestMessage(Report, CollectionUri)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/xml"),
        };
        request.Headers.Add("Depth", "1");

        using var response = await _http.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return []; // collection not created yet — no tasks
        }

        response.EnsureSuccessStatusCode();
        var xml = await response.Content.ReadAsStringAsync(cancellationToken);

        return ParseMultistatus(xml)
            .Where(todo => includeCompleted || !todo.Completed)
            .OrderBy(todo => todo.Due ?? DateTimeOffset.MaxValue)
            .ToList();
    }

    public async Task<TodoItem> CreateAsync(TodoInput input, CancellationToken cancellationToken = default)
    {
        await EnsureCollectionAsync(cancellationToken);
        var uid = Guid.NewGuid().ToString("N");
        await PutAsync(uid, input, cancellationToken);
        return ToTodo(uid, input);
    }

    public async Task<TodoItem?> UpdateAsync(string uid, TodoInput input, CancellationToken cancellationToken = default)
    {
        using var head = new HttpRequestMessage(HttpMethod.Head, TodoUri(uid));
        using var headResponse = await _http.SendAsync(head, cancellationToken);
        if (headResponse.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        await PutAsync(uid, input, cancellationToken);
        return ToTodo(uid, input);
    }

    public async Task<bool> DeleteAsync(string uid, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete, TodoUri(uid));
        using var response = await _http.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }

        response.EnsureSuccessStatusCode();
        return true;
    }

    private async Task PutAsync(string uid, TodoInput input, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, TodoUri(uid))
        {
            Content = new StringContent(TaskIcs.Serialize(uid, input), Encoding.UTF8, "text/calendar"),
        };
        using var response = await _http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private async Task EnsureCollectionAsync(CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(MkCalendar, CollectionUri);
        using var response = await _http.SendAsync(request, cancellationToken);
        // The collection already exists when MKCALENDAR is rejected with 405 (Method Not Allowed)
        // or 409 (Conflict, as Radicale reports it); both are fine.
        if (response.StatusCode != HttpStatusCode.MethodNotAllowed
            && response.StatusCode != HttpStatusCode.Conflict
            && !response.IsSuccessStatusCode)
        {
            response.EnsureSuccessStatusCode();
        }
    }

    private static IEnumerable<TodoItem> ParseMultistatus(string xml)
    {
        XDocument doc;
        try
        {
            doc = XDocument.Parse(xml);
        }
        catch (System.Xml.XmlException)
        {
            return [];
        }

        return doc.Descendants(Caldav + "calendar-data")
            .SelectMany(node => TaskIcs.ParseTodos(node.Value));
    }

    private static TodoItem ToTodo(string uid, TodoInput input) =>
        new(uid, input.Title, input.Due, input.Completed, input.Description);
}

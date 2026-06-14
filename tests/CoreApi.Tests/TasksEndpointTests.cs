using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Tasks;

namespace CoreApi.Tests;

public class TasksEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Lists_open_by_default_and_all_when_requested()
    {
        var store = new FakeTasks([
            new TodoItem("o1", "Open", null, false, null),
            new TodoItem("d1", "Done", null, true, null),
        ]);
        var client = AuthedWith(store);

        var open = await client.GetFromJsonAsync<List<TodoDto>>("/api/tasks");
        var all = await client.GetFromJsonAsync<List<TodoDto>>("/api/tasks?all=true");

        Assert.NotNull(open);
        Assert.Single(open!);
        Assert.Equal("o1", open![0].Uid);
        Assert.Equal(2, all!.Count);
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_caldav_fails()
    {
        var client = AuthedWith(new ThrowingTasks());
        var response = await client.GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Creates_a_task_and_lists_it()
    {
        var client = AuthedWith(new FakeTasks([]));

        var create = await client.PostAsJsonAsync("/api/tasks", new { title = "Buy milk" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<TodoDto>();
        Assert.False(string.IsNullOrEmpty(created!.Uid));

        var list = await client.GetFromJsonAsync<List<TodoDto>>("/api/tasks");
        Assert.Contains(list!, t => t.Title == "Buy milk");
    }

    [Fact]
    public async Task Rejects_a_blank_title()
    {
        var client = AuthedWith(new FakeTasks([]));
        var response = await client.PostAsJsonAsync("/api/tasks", new { title = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Toggling_complete_removes_it_from_the_default_list()
    {
        var client = AuthedWith(new FakeTasks([new TodoItem("t1", "Do it", null, false, null)]));

        var put = await client.PutAsJsonAsync("/api/tasks/t1", new { title = "Do it", completed = true });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var open = await client.GetFromJsonAsync<List<TodoDto>>("/api/tasks");
        Assert.DoesNotContain(open!, t => t.Uid == "t1");
        var all = await client.GetFromJsonAsync<List<TodoDto>>("/api/tasks?all=true");
        Assert.Contains(all!, t => t.Uid == "t1" && t.Completed);
    }

    [Fact]
    public async Task Update_and_delete_404_unknown()
    {
        var client = AuthedWith(new FakeTasks([new TodoItem("d1", "x", null, false, null)]));

        var missingPut = await client.PutAsJsonAsync("/api/tasks/nope", new { title = "y" });
        Assert.Equal(HttpStatusCode.NotFound, missingPut.StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/tasks/d1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync("/api/tasks/d1")).StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Tasks__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var tasksResponse = await client.GetAsync("/api/tasks");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, tasksResponse.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "tasks");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Tasks__Enabled", null);
        }
    }

    private HttpClient AuthedWith(ITaskClient tasks)
    {
        var client = _factory.Authed(s => s.AddSingleton(tasks)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record TodoDto(string Uid, string Title, bool Completed);

    private sealed record PluginDto(string Id);

    private sealed class FakeTasks(IEnumerable<TodoItem> seed) : ITaskClient
    {
        private readonly List<TodoItem> _todos = [.. seed];

        public Task<IReadOnlyList<TodoItem>> ListAsync(bool includeCompleted, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<TodoItem>>(
                _todos.Where(t => includeCompleted || !t.Completed).ToList());

        public Task<TodoItem> CreateAsync(TodoInput input, CancellationToken ct = default)
        {
            var todo = new TodoItem(Guid.NewGuid().ToString("N"), input.Title, input.Due, input.Completed, input.Description);
            _todos.Add(todo);
            return Task.FromResult(todo);
        }

        public Task<TodoItem?> UpdateAsync(string uid, TodoInput input, CancellationToken ct = default)
        {
            var index = _todos.FindIndex(t => t.Uid == uid);
            if (index < 0)
            {
                return Task.FromResult<TodoItem?>(null);
            }

            var todo = new TodoItem(uid, input.Title, input.Due, input.Completed, input.Description);
            _todos[index] = todo;
            return Task.FromResult<TodoItem?>(todo);
        }

        public Task<bool> DeleteAsync(string uid, CancellationToken ct = default) =>
            Task.FromResult(_todos.RemoveAll(t => t.Uid == uid) > 0);
    }

    private sealed class ThrowingTasks : ITaskClient
    {
        public Task<IReadOnlyList<TodoItem>> ListAsync(bool includeCompleted, CancellationToken ct = default) =>
            throw new HttpRequestException("CalDAV unreachable");

        public Task<TodoItem> CreateAsync(TodoInput input, CancellationToken ct = default) =>
            throw new HttpRequestException("CalDAV unreachable");

        public Task<TodoItem?> UpdateAsync(string uid, TodoInput input, CancellationToken ct = default) =>
            throw new HttpRequestException("CalDAV unreachable");

        public Task<bool> DeleteAsync(string uid, CancellationToken ct = default) =>
            throw new HttpRequestException("CalDAV unreachable");
    }
}

using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Tasks;

/// <summary>Read + write CalDAV to-do plugin: lists/creates/updates/completes/deletes VTODOs.</summary>
public sealed class TasksPlugin : IPlugin
{
    public string Id => "tasks";

    public PluginManifest Manifest { get; } = new("tasks", "Tasks", "/tasks", ["tasks-open"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<TaskOptions>(config);
        services.AddHttpClient<ITaskClient, TaskDavClient>();
    }
}

/// <summary><c>GET /api/tasks?all=true</c> — open tasks by default; all when requested.</summary>
internal sealed class ListTasksEndpoint : EndpointWithoutRequest<IReadOnlyList<TodoItem>>
{
    public override void Configure() => Get("/tasks");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var client = Resolve<ITaskClient>();
        var includeCompleted = Query<bool?>("all", isRequired: false) ?? false;
        try
        {
            var todos = await client.ListAsync(includeCompleted, ct);
            await Send.OkAsync(todos, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

/// <summary><c>POST /api/tasks</c> — create a to-do.</summary>
internal sealed class CreateTaskEndpoint : Endpoint<TodoInput, TodoItem>
{
    public override void Configure() => Post("/tasks");

    public override async Task HandleAsync(TodoInput req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
        {
            await Send.ResultAsync(Results.BadRequest(new { error = "title is required" }));
            return;
        }

        var client = Resolve<ITaskClient>();
        try
        {
            var created = await client.CreateAsync(req, ct);
            await Send.ResultAsync(Results.Created($"/api/tasks/{created.Uid}", created));
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

/// <summary><c>PUT /api/tasks/{uid}</c> — update a to-do (including completion).</summary>
internal sealed class UpdateTaskEndpoint : Endpoint<UpdateTaskRequest, TodoItem>
{
    public override void Configure() => Put("/tasks/{uid}");

    public override async Task HandleAsync(UpdateTaskRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
        {
            await Send.ResultAsync(Results.BadRequest(new { error = "title is required" }));
            return;
        }

        var client = Resolve<ITaskClient>();
        try
        {
            var updated = await client.UpdateAsync(
                req.Uid,
                new TodoInput(req.Title, req.Due, req.Completed, req.Description),
                ct);
            if (updated is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(updated, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

/// <summary><c>DELETE /api/tasks/{uid}</c> — delete a to-do.</summary>
internal sealed class DeleteTaskEndpoint : EndpointWithoutRequest
{
    public override void Configure() => Delete("/tasks/{uid}");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var uid = Route<string>("uid")!;
        var client = Resolve<ITaskClient>();
        try
        {
            var deleted = await client.DeleteAsync(uid, ct);
            if (!deleted)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.NoContentAsync(ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

/// <summary>Update request: <c>uid</c> from the route, the rest from the JSON body.</summary>
public sealed class UpdateTaskRequest
{
    public string Uid { get; set; } = "";

    public string Title { get; set; } = "";

    public DateTimeOffset? Due { get; set; }

    public bool Completed { get; set; }

    public string? Description { get; set; }
}

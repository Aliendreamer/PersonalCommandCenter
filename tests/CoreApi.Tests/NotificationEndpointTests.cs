using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins;

namespace CoreApi.Tests;

public class NotificationEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Lists_with_unread_count_marks_one_and_all()
    {
        var authed = _factory.Authed();
        var client = authed.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");

        using (var scope = authed.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CoreApi.Data.PccDbContext>();
            db.Notifications.Add(new CoreApi.Data.Notification
            {
                Source = "test",
                Severity = NotificationSeverity.Info,
                Title = "first",
                CreatedAt = DateTimeOffset.UtcNow,
            });
            db.Notifications.Add(new CoreApi.Data.Notification
            {
                Source = "test",
                Severity = NotificationSeverity.Warning,
                Title = "second",
                CreatedAt = DateTimeOffset.UtcNow.AddSeconds(1),
            });
            await db.SaveChangesAsync();
            Assert.Equal(2, await db.Notifications.CountAsync());
        }

        var list = await client.GetFromJsonAsync<ListDto>("/api/notifications");
        Assert.NotNull(list);
        Assert.Equal(2, list!.Unread);
        Assert.Equal(2, list.Notifications.Count);
        Assert.Equal("Warning", list.Notifications[0].Severity); // newest first, string enum

        var read = await client.PostAsync($"/api/notifications/{list.Notifications[0].Id}/read", null);
        Assert.Equal(HttpStatusCode.NoContent, read.StatusCode);
        Assert.Equal(1, (await client.GetFromJsonAsync<ListDto>("/api/notifications"))!.Unread);

        var unknown = await client.PostAsync($"/api/notifications/{Guid.NewGuid()}/read", null);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);

        var all = await client.PostAsync("/api/notifications/read-all", null);
        Assert.Equal(HttpStatusCode.NoContent, all.StatusCode);
        Assert.Equal(0, (await client.GetFromJsonAsync<ListDto>("/api/notifications"))!.Unread);
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/notifications");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Notifications__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/notifications");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "notifications");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Notifications__Enabled", null);
        }
    }

    private sealed record ListDto(List<NotifDto> Notifications, int Unread);

    private sealed record NotifDto(Guid Id, string Source, string Severity, string Title);

    private sealed record PluginDto(string Id);
}

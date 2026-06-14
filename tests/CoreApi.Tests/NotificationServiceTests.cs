using CoreApi.Data;
using CoreApi.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pcc.Plugins;

namespace CoreApi.Tests;

public class NotificationServiceTests
{
    private static PccDbContext NewDb() =>
        new(new DbContextOptionsBuilder<PccDbContext>()
            .UseInMemoryDatabase("notif-" + Guid.NewGuid())
            .Options);

    private static NotificationService Service(PccDbContext db, INtfyClient ntfy) =>
        new(db, ntfy, NullLogger<NotificationService>.Instance);

    [Fact]
    public async Task Publish_persists_and_delivers_to_ntfy()
    {
        using var db = NewDb();
        var ntfy = new RecordingNtfy();
        var service = Service(db, ntfy);

        await service.PublishAsync("system", NotificationSeverity.Info, "Online");

        Assert.Equal(1, await db.Notifications.CountAsync());
        Assert.Equal(1, ntfy.Calls);
    }

    [Fact]
    public async Task Publish_persists_even_when_ntfy_throws()
    {
        using var db = NewDb();
        var service = Service(db, new ThrowingNtfy());

        await service.PublishAsync("system", NotificationSeverity.Error, "Boom");

        Assert.Equal(1, await db.Notifications.CountAsync());
    }

    [Fact]
    public async Task Lists_newest_first_with_unread_count()
    {
        using var db = NewDb();
        var service = Service(db, new RecordingNtfy());
        await service.PublishAsync("a", NotificationSeverity.Info, "first");
        await Task.Delay(5);
        await service.PublishAsync("b", NotificationSeverity.Warning, "second");

        var list = await service.ListAsync();

        Assert.Equal("second", list[0].Title);
        Assert.Equal(2, await service.UnreadCountAsync());
    }

    [Fact]
    public async Task Mark_read_sets_readat_and_404s_unknown()
    {
        using var db = NewDb();
        var service = Service(db, new RecordingNtfy());
        await service.PublishAsync("a", NotificationSeverity.Info, "x");
        var id = (await service.ListAsync())[0].Id;

        Assert.True(await service.MarkReadAsync(id));
        Assert.Equal(0, await service.UnreadCountAsync());
        Assert.False(await service.MarkReadAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task Mark_all_read_clears_the_unread_count()
    {
        using var db = NewDb();
        var service = Service(db, new RecordingNtfy());
        await service.PublishAsync("a", NotificationSeverity.Info, "x");
        await service.PublishAsync("b", NotificationSeverity.Info, "y");

        await service.MarkAllReadAsync();

        Assert.Equal(0, await service.UnreadCountAsync());
    }

    private sealed class RecordingNtfy : INtfyClient
    {
        public int Calls { get; private set; }

        public Task PublishAsync(NotificationSeverity severity, string title, string? message, CancellationToken ct = default)
        {
            Calls++;
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingNtfy : INtfyClient
    {
        public Task PublishAsync(NotificationSeverity severity, string title, string? message, CancellationToken ct = default) =>
            throw new HttpRequestException("ntfy down");
    }
}

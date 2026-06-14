using Pcc.Plugins.Tasks;

namespace CoreApi.Tests;

public class TaskIcsTests
{
    [Fact]
    public void Round_trips_an_open_task_with_a_due_date()
    {
        var input = new TodoInput(
            "Buy milk",
            Due: new DateTimeOffset(2026, 6, 15, 17, 0, 0, TimeSpan.Zero),
            Completed: false,
            Description: "2%");

        var ics = TaskIcs.Serialize("uid-1", input);
        var parsed = Assert.Single(TaskIcs.ParseTodos(ics));

        Assert.Equal("uid-1", parsed.Uid);
        Assert.Equal("Buy milk", parsed.Title);
        Assert.False(parsed.Completed);
        Assert.Equal(input.Due, parsed.Due);
        Assert.Equal("2%", parsed.Description);
        Assert.Contains("STATUS:NEEDS-ACTION", ics, StringComparison.Ordinal);
    }

    [Fact]
    public void Round_trips_a_completed_task_without_a_due_date()
    {
        var input = new TodoInput("Submit report", Due: null, Completed: true);

        var ics = TaskIcs.Serialize("uid-2", input);

        Assert.Contains("STATUS:COMPLETED", ics, StringComparison.Ordinal);
        Assert.Contains("PERCENT-COMPLETE:100", ics, StringComparison.Ordinal);
        var parsed = Assert.Single(TaskIcs.ParseTodos(ics));
        Assert.True(parsed.Completed);
        Assert.Null(parsed.Due);
    }

    [Fact]
    public void Escapes_and_unescapes_special_characters()
    {
        var input = new TodoInput("Email Bob; re: lunch, today");

        var ics = TaskIcs.Serialize("uid-3", input);
        var parsed = Assert.Single(TaskIcs.ParseTodos(ics));

        Assert.Equal("Email Bob; re: lunch, today", parsed.Title);
    }

    [Fact]
    public void Parses_caldav_data_with_crlf()
    {
        const string data =
            "BEGIN:VCALENDAR\r\nBEGIN:VTODO\r\nUID:remote-1\r\nSUMMARY:Call plumber\r\n" +
            "STATUS:NEEDS-ACTION\r\nEND:VTODO\r\nEND:VCALENDAR\r\n";

        var parsed = Assert.Single(TaskIcs.ParseTodos(data));

        Assert.Equal("remote-1", parsed.Uid);
        Assert.Equal("Call plumber", parsed.Title);
        Assert.False(parsed.Completed);
    }
}

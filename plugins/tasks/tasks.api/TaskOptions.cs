namespace Pcc.Plugins.Tasks;

/// <summary>Bound from the plugin's config section (<c>Plugins:Tasks</c>).</summary>
public sealed class TaskOptions
{
    /// <summary>CalDAV server base URL (e.g. <c>http://radicale:5232</c>).</summary>
    public string BaseUrl { get; set; } = "";

    /// <summary>Collection path on the server (e.g. <c>/pcc/tasks/</c>).</summary>
    public string Collection { get; set; } = "/pcc/tasks/";

    public string Username { get; set; } = "";

    public string Password { get; set; } = "";
}

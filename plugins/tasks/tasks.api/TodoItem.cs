namespace Pcc.Plugins.Tasks;

/// <summary>A to-do (VTODO), slimmed to what the command center renders and edits.</summary>
public sealed record TodoItem(
    string Uid,
    string Title,
    DateTimeOffset? Due,
    bool Completed,
    string? Description);

/// <summary>The writable fields of a to-do (create/update); the server owns the <c>Uid</c>.</summary>
public sealed record TodoInput(
    string Title,
    DateTimeOffset? Due = null,
    bool Completed = false,
    string? Description = null);

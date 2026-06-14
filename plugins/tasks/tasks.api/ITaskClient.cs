namespace Pcc.Plugins.Tasks;

/// <summary>Reads and writes to-dos over CalDAV. Abstracted so endpoints/tests can fake it.</summary>
public interface ITaskClient
{
    /// <summary>Lists to-dos; completed items are excluded unless <paramref name="includeCompleted"/>.</summary>
    Task<IReadOnlyList<TodoItem>> ListAsync(bool includeCompleted, CancellationToken cancellationToken = default);

    /// <summary>Creates a to-do and returns it with its server-assigned <c>Uid</c>.</summary>
    Task<TodoItem> CreateAsync(TodoInput input, CancellationToken cancellationToken = default);

    /// <summary>Updates a to-do (including completion); returns <c>null</c> when the uid is unknown.</summary>
    Task<TodoItem?> UpdateAsync(string uid, TodoInput input, CancellationToken cancellationToken = default);

    /// <summary>Deletes a to-do; returns <c>false</c> when the uid is unknown.</summary>
    Task<bool> DeleteAsync(string uid, CancellationToken cancellationToken = default);
}

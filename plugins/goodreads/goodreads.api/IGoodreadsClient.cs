namespace Pcc.Plugins.Goodreads;

/// <summary>Reads a Goodreads shelf via its RSS feed. Abstracted so endpoints/tests can fake it.</summary>
public interface IGoodreadsClient
{
    Task<IReadOnlyList<Book>> GetShelfAsync(CancellationToken cancellationToken = default);
}

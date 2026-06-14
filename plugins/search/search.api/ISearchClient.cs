namespace Pcc.Plugins.Search;

/// <summary>Queries a metasearch backend (SearXNG). Abstracted so endpoints/tests can fake it.</summary>
public interface ISearchClient
{
    Task<IReadOnlyList<SearchResult>> SearchAsync(string query, CancellationToken cancellationToken = default);
}

namespace Pcc.Plugins.Models;

public sealed record CompareResult(string Model, string? Content, string? Error, long DurationMs);

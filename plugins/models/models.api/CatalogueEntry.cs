namespace Pcc.Plugins.Models;

public sealed record CatalogueEntry(
    string Name,
    string Description,
    string ParameterSize,
    string Quantization,
    double SizeGb,
    string Family,
    string[] Tags,
    string Fits);  // "yes" | "marginal" | "no" | "unknown"

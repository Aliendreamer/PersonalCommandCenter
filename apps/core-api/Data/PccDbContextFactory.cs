using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CoreApi.Data;

/// <summary>Design-time factory so <c>dotnet ef</c> can build the context without running the app.</summary>
public sealed class PccDbContextFactory : IDesignTimeDbContextFactory<PccDbContext>
{
    public PccDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<PccDbContext>()
            .UseNpgsql("Host=localhost;Database=pcc;Username=pcc;Password=pcc")
            .Options);
}

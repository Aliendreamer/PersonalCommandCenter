using Microsoft.EntityFrameworkCore;

namespace CoreApi.Data;

/// <summary>The app's EF Core context: locally-provisioned users and server-owned sessions.</summary>
public sealed class PccDbContext(DbContextOptions<PccDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSession> Sessions => Set<UserSession>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Sub).IsUnique();
            e.Property(x => x.Sub).IsRequired();
        });

        model.Entity<UserSession>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => x.Subject);
            e.Property(x => x.TokenHash).IsRequired();
            e.Property(x => x.AccessToken).IsRequired();
        });
    }
}

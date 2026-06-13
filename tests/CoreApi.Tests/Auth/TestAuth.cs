using System.Security.Claims;
using System.Text.Encodings.Web;
using CoreApi.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CoreApi.Tests.Auth;

/// <summary>Authenticates a request as a fixed user when the <c>X-Test-User</c> header is present.</summary>
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string Header = "X-Test-User";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.ContainsKey(Header))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new[]
        {
            new Claim("sub", "test-sub"),
            new Claim("email", "tester@pcc.local"),
            new Claim("realm_access", """{"roles":["User"]}"""),
        };
        var ticket = new AuthenticationTicket(
            new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName)), SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

/// <summary>Test-factory helpers: swap the DB to in-memory and make the Test scheme the default.</summary>
public static class TestFactoryExtensions
{
    public static WebApplicationFactory<Program> Authed(
        this WebApplicationFactory<Program> factory,
        Action<IServiceCollection>? extra = null) =>
        factory.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
        {
            foreach (var d in services.Where(d =>
                d.ServiceType == typeof(DbContextOptions<PccDbContext>)
                || d.ServiceType == typeof(DbContextOptions)
                || (d.ServiceType.FullName?.Contains("IDbContextOptionsConfiguration", StringComparison.Ordinal) ?? false))
                .ToList())
            {
                services.Remove(d);
            }

            services.AddDbContext<PccDbContext>(o => o.UseInMemoryDatabase("authed-" + Guid.NewGuid()));
            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            services.Configure<AuthenticationOptions>(o =>
            {
                o.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                o.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });
            extra?.Invoke(services);
        }));

    public static HttpClient AuthedClient(this WebApplicationFactory<Program> factory)
    {
        var client = factory.Authed().CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }
}

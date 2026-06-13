using FastEndpoints;
using Microsoft.Extensions.Options;

namespace CoreApi.Auth;

/// <summary>The identity returned by <c>GET /api/me</c>.</summary>
public sealed record MeResponse(int Id, string Subject, string? Email, IReadOnlyList<string> Roles);

/// <summary><c>GET /api/auth/login</c> — start the OIDC flow (PKCE cookie + authorize redirect).</summary>
internal sealed class LoginEndpoint : EndpointWithoutRequest
{
    public override void Configure()
    {
        Get("/auth/login");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var opts = Resolve<IOptions<AuthOptions>>().Value;
        var keycloak = Resolve<IKeycloakClient>();
        var secure = !Resolve<IHostEnvironment>().IsDevelopment();

        var returnTo = OidcProtocol.SanitizeReturnTo(Query<string>("returnTo", isRequired: false));
        var (verifier, challenge) = OidcProtocol.CreatePkce();
        var nonce = OidcProtocol.NewNonce();

        AuthCookies.SetPkce(HttpContext, opts.Cookies, $"{nonce}.{verifier}", secure);
        var state = OidcProtocol.EncodeState(nonce, returnTo);
        await Send.RedirectAsync(keycloak.BuildAuthorizeUrl(challenge, state), allowRemoteRedirects: true);
    }
}

/// <summary><c>GET /api/auth/callback</c> — exchange the code, start a session, redirect to the app.</summary>
internal sealed class CallbackEndpoint : EndpointWithoutRequest
{
    public override void Configure()
    {
        Get("/auth/callback");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var opts = Resolve<IOptions<AuthOptions>>().Value;
        var keycloak = Resolve<IKeycloakClient>();
        var sessions = Resolve<ISessionService>();
        var secure = !Resolve<IHostEnvironment>().IsDevelopment();

        var code = Query<string>("code", isRequired: false);
        var state = Query<string>("state", isRequired: false);
        var pkce = AuthCookies.GetPkce(HttpContext, opts.Cookies);
        AuthCookies.ClearPkce(HttpContext, opts.Cookies);

        var dot = pkce?.IndexOf('.') ?? -1;
        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state) || dot <= 0)
        {
            await Send.ResultAsync(Results.BadRequest());
            return;
        }

        var cookieNonce = pkce![..dot];
        var verifier = pkce[(dot + 1)..];
        if (!OidcProtocol.TryDecodeState(state, out var stateNonce, out var returnTo) || stateNonce != cookieNonce)
        {
            await Send.ResultAsync(Results.BadRequest());
            return;
        }

        var tokens = await keycloak.ExchangeCodeAsync(code, verifier, ct);
        var sub = OidcProtocol.ReadSubject(tokens.AccessToken);
        if (sub is null)
        {
            await Send.ResultAsync(Results.BadRequest());
            return;
        }

        var raw = await sessions.CreateAsync(sub, tokens, ct);
        AuthCookies.SetSession(HttpContext, opts.Cookies, raw, secure);
        await Send.RedirectAsync($"{opts.Keycloak.AppBaseUrl}{returnTo}", allowRemoteRedirects: true);
    }
}

/// <summary><c>GET /api/auth/logout</c> — revoke the session server-side and end the Keycloak SSO.</summary>
internal sealed class LogoutEndpoint : EndpointWithoutRequest
{
    public override void Configure()
    {
        Get("/auth/logout");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var opts = Resolve<IOptions<AuthOptions>>().Value;
        var keycloak = Resolve<IKeycloakClient>();
        var sessions = Resolve<ISessionService>();

        var sid = AuthCookies.GetSession(HttpContext, opts.Cookies);
        if (!string.IsNullOrEmpty(sid))
        {
            await sessions.RevokeAsync(sid, ct);
        }

        AuthCookies.ClearSession(HttpContext, opts.Cookies);
        await Send.RedirectAsync(keycloak.BuildEndSessionUrl(null), allowRemoteRedirects: true);
    }
}

/// <summary><c>GET /api/me</c> — the current identity; requires an authenticated session.</summary>
internal sealed class MeEndpoint : EndpointWithoutRequest<MeResponse>
{
    public override void Configure()
    {
        Get("/me");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var current = Resolve<ICurrentUser>();
        HttpContext.Response.Headers.CacheControl = "no-store";
        await Send.OkAsync(new MeResponse(current.Id, current.Sub, current.Email, current.Roles), ct);
    }
}

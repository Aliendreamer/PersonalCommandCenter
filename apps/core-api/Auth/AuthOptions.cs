namespace CoreApi.Auth;

/// <summary>Auth configuration, bound from the <c>"Auth"</c> section (Keycloak / Cookies / Store).</summary>
public sealed class AuthOptions
{
    public KeycloakSettings Keycloak { get; set; } = new();
    public CookieSettings Cookies { get; set; } = new();
    public StoreSettings Store { get; set; } = new();
}

public sealed class KeycloakSettings
{
    /// <summary>Realm base, e.g. <c>http://keycloak.pcc.localhost/realms/Pcc</c>.</summary>
    public string Authority { get; set; } = "";
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";

    /// <summary>Absolute callback the API owns, e.g. <c>http://api.pcc.localhost/api/auth/callback</c>.</summary>
    public string CallbackUri { get; set; } = "";

    /// <summary>Absolute app base the callback redirects back to, e.g. <c>http://app.pcc.localhost</c>.</summary>
    public string AppBaseUrl { get; set; } = "";

    public string PostLogoutRedirectUri { get; set; } = "";
}

public sealed class CookieSettings
{
    public string Domain { get; set; } = "";
    public string SessionName { get; set; } = "mp_sid";
    public string PkceName { get; set; } = "mp_pkce";
}

public sealed class StoreSettings
{
    public TimeSpan CleanupInterval { get; set; } = TimeSpan.FromMinutes(30);
}

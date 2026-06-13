namespace CoreApi.Auth;

/// <summary>Reads/writes the opaque session (<c>mp_sid</c>) and PKCE (<c>mp_pkce</c>) cookies.</summary>
public static class AuthCookies
{
    public static void SetSession(HttpContext ctx, CookieSettings s, string value, bool secure) =>
        ctx.Response.Cookies.Append(s.SessionName, value, Build(s, secure, TimeSpan.FromDays(7)));

    public static void SetPkce(HttpContext ctx, CookieSettings s, string value, bool secure) =>
        ctx.Response.Cookies.Append(s.PkceName, value, Build(s, secure, TimeSpan.FromMinutes(10)));

    public static string? GetSession(HttpContext ctx, CookieSettings s) => ctx.Request.Cookies[s.SessionName];

    public static string? GetPkce(HttpContext ctx, CookieSettings s) => ctx.Request.Cookies[s.PkceName];

    public static void ClearSession(HttpContext ctx, CookieSettings s) =>
        ctx.Response.Cookies.Delete(s.SessionName, Delete(s));

    public static void ClearPkce(HttpContext ctx, CookieSettings s) =>
        ctx.Response.Cookies.Delete(s.PkceName, Delete(s));

    private static CookieOptions Build(CookieSettings s, bool secure, TimeSpan maxAge) => new()
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Path = "/",
        Secure = secure,
        MaxAge = maxAge,
        Domain = string.IsNullOrEmpty(s.Domain) ? null : s.Domain,
    };

    private static CookieOptions Delete(CookieSettings s) => new()
    {
        Path = "/",
        Domain = string.IsNullOrEmpty(s.Domain) ? null : s.Domain,
    };
}

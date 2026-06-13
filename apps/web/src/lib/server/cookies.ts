// SSR-BFF cookie re-homing. core-api sets Domain-scoped `mp_sid`/`mp_pkce`; the SSR server
// re-homes them to app-scoped cookies (no Domain; `__Host-`+Secure in prod) for the browser, and
// maps them back to the API names when forwarding server-to-server. Pure + unit-tested.

const AUTH_COOKIES = ['mp_sid', 'mp_pkce'] as const
const HOST_PREFIX = '__Host-'

/**
 * Rewrites a `Set-Cookie` value from core-api into an app-scoped cookie:
 * strips `Domain`, forces `Path=/`/`HttpOnly`/`SameSite=Lax`, preserves the original lifetime
 * (`Max-Age`/`Expires`), and — when `secure` — adds the `__Host-` prefix + `Secure`.
 */
export function rehomeSetCookie(setCookie: string, secure: boolean): string {
  const segments = setCookie.split(/;\s*/)
  const eq = segments[0].indexOf('=')
  const name = segments[0].slice(0, eq)
  const value = segments[0].slice(eq + 1)

  const lifetime = segments
    .slice(1)
    .filter((s) => /^(max-age|expires)=/i.test(s))

  const outName = secure ? HOST_PREFIX + name : name
  const attrs = [
    `${outName}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...lifetime,
  ]
  if (secure) {
    attrs.push('Secure')
  }
  return attrs.join('; ')
}

/**
 * Builds the `Cookie` header to send to core-api from the browser's incoming `Cookie` header:
 * keeps only the auth cookies and maps app cookie names (`__Host-…` in prod) back to the API names.
 */
export function forwardCookieHeader(
  cookieHeader: string | null | undefined,
  secure: boolean,
): string {
  if (!cookieHeader) {
    return ''
  }

  const out: string[] = []
  for (const pair of cookieHeader.split(/;\s*/)) {
    const eq = pair.indexOf('=')
    if (eq === -1) {
      continue
    }
    let name = pair.slice(0, eq)
    const value = pair.slice(eq + 1)
    if (secure && name.startsWith(HOST_PREFIX)) {
      name = name.slice(HOST_PREFIX.length)
    }
    if ((AUTH_COOKIES as readonly string[]).includes(name)) {
      out.push(`${name}=${value}`)
    }
  }
  return out.join('; ')
}

/** True when the SSR server should issue `__Host-`+`Secure` cookies (real HTTPS deployment). */
export function cookiesAreSecure(): boolean {
  return process.env.COOKIE_SECURE === 'true'
}

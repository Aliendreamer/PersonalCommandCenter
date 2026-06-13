import {
  cookiesAreSecure,
  forwardCookieHeader,
  rehomeSetCookie,
} from './cookies'

const apiUrl = () => process.env.API_URL ?? 'http://core-api:8080'

/**
 * Proxies `/api/auth/<splat>` to core-api over the internal network. Forwards only the auth cookies
 * (mapped back to the API names), relays the status + `Location` (for the OIDC 302 dance), and
 * re-homes every `Set-Cookie` to an app-scoped cookie for the browser. The browser only ever talks
 * to this SSR server; core-api is never publicly exposed.
 */
export async function proxyAuth(
  request: Request,
  splat: string,
): Promise<Response> {
  const secure = cookiesAreSecure()
  const { search } = new URL(request.url)
  const cookie = forwardCookieHeader(request.headers.get('cookie'), secure)

  const upstream = await fetch(`${apiUrl()}/api/auth/${splat}${search}`, {
    method: request.method,
    headers: cookie ? { cookie } : {},
    redirect: 'manual', // we relay the 302s to the browser ourselves
  })

  const headers = new Headers()
  const location = upstream.headers.get('location')
  if (location) {
    headers.set('location', location)
  }
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : []
  for (const sc of setCookies) {
    headers.append('set-cookie', rehomeSetCookie(sc, secure))
  }
  const contentType = upstream.headers.get('content-type')
  if (contentType) {
    headers.set('content-type', contentType)
  }

  const noBody = upstream.status === 204 || upstream.status === 304
  const body = noBody ? null : await upstream.arrayBuffer()
  return new Response(body, { status: upstream.status, headers })
}

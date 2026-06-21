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

  // Forward the request body for non-GET methods so a future POST auth endpoint (e.g. back-channel
  // logout) isn't silently emptied. Auth is GET-only today, so this is a latent safety net.
  const forwardsBody = request.method !== 'GET' && request.method !== 'HEAD'
  const requestHeaders: Record<string, string> = {}
  if (cookie) requestHeaders.cookie = cookie
  const requestContentType = request.headers.get('content-type')
  if (forwardsBody && requestContentType)
    requestHeaders['content-type'] = requestContentType

  const upstream = await fetch(`${apiUrl()}/api/auth/${splat}${search}`, {
    method: request.method,
    headers: requestHeaders,
    redirect: 'manual', // we relay the 302s to the browser ourselves
    ...(forwardsBody && request.body
      ? { body: request.body, duplex: 'half' }
      : {}),
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

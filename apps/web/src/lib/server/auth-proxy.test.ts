// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { proxyAuth } from './auth-proxy'

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.COOKIE_SECURE
})

describe('proxyAuth', () => {
  it('forwards to core-api with the mapped auth cookie and relays the 302 + re-homed cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          location:
            'http://keycloak.pcc.localhost/realms/Pcc/protocol/openid-connect/auth?x=1',
          'set-cookie':
            'mp_pkce=nonce.verifier; Path=/; Domain=.pcc.localhost; HttpOnly; SameSite=Lax',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const req = new Request(
      'http://app.pcc.localhost/api/auth/login?returnTo=/devices',
      {
        headers: { cookie: 'mp_sid=sess; theme=dark' },
      },
    )
    const res = await proxyAuth(req, 'login')

    // upstream call: internal core-api URL + query preserved + only auth cookie forwarded
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://core-api:8080/api/auth/login?returnTo=/devices')
    expect(init.headers.cookie).toBe('mp_sid=sess')
    expect(init.redirect).toBe('manual')

    // browser-facing response: 302 relayed, Location intact, Set-Cookie re-homed (no Domain)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('keycloak.pcc.localhost')
    const setCookie = res.headers.getSetCookie()[0]
    expect(setCookie).toMatch(/^mp_pkce=nonce\.verifier;/)
    expect(setCookie).not.toMatch(/Domain=/i)
  })

  it('relays a callback 302 to the app with a re-homed session cookie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: {
            location: 'http://app.pcc.localhost/devices',
            'set-cookie':
              'mp_sid=opaque; Path=/; Domain=.pcc.localhost; HttpOnly; SameSite=Lax; Max-Age=604800',
          },
        }),
      ),
    )

    const req = new Request(
      'http://app.pcc.localhost/api/auth/callback?code=c&state=s',
      {
        headers: { cookie: 'mp_pkce=nonce.verifier' },
      },
    )
    const res = await proxyAuth(req, 'callback')

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('http://app.pcc.localhost/devices')
    const setCookie = res.headers.getSetCookie()[0]
    expect(setCookie).toMatch(/^mp_sid=opaque;/)
    expect(setCookie).not.toMatch(/Domain=/i)
    expect(setCookie).toMatch(/Max-Age=604800/)
  })
})

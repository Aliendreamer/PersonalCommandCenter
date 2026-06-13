import { describe, expect, it } from 'vitest'
import { forwardCookieHeader, rehomeSetCookie } from './cookies'

describe('rehomeSetCookie', () => {
  const fromApi =
    'mp_sid=abc123; Path=/; Domain=.pcc.localhost; HttpOnly; SameSite=Lax; Max-Age=604800'

  it('strips Domain and app-scopes the cookie in dev (no __Host-, no Secure)', () => {
    const out = rehomeSetCookie(fromApi, false)
    expect(out).toMatch(/^mp_sid=abc123;/)
    expect(out).not.toMatch(/Domain=/i)
    expect(out).not.toMatch(/Secure/i)
    expect(out).not.toMatch(/__Host-/)
    expect(out).toMatch(/Path=\//)
    expect(out).toMatch(/HttpOnly/)
    expect(out).toMatch(/SameSite=Lax/)
    expect(out).toMatch(/Max-Age=604800/)
  })

  it('uses the __Host- prefix and Secure in prod', () => {
    const out = rehomeSetCookie(fromApi, true)
    expect(out).toMatch(/^__Host-mp_sid=abc123;/)
    expect(out).toMatch(/Secure/)
    expect(out).not.toMatch(/Domain=/i)
    expect(out).toMatch(/Path=\//)
  })

  it('preserves a clearing cookie (Max-Age=0)', () => {
    const out = rehomeSetCookie(
      'mp_sid=; Path=/; Domain=.pcc.localhost; Max-Age=0',
      false,
    )
    expect(out).toMatch(/^mp_sid=;/)
    expect(out).toMatch(/Max-Age=0/)
  })
})

describe('forwardCookieHeader', () => {
  it('keeps only the auth cookies and passes them through in dev', () => {
    expect(
      forwardCookieHeader('mp_sid=abc; theme=dark; mp_pkce=xyz', false),
    ).toBe('mp_sid=abc; mp_pkce=xyz')
  })

  it('maps __Host- prefixed cookies back to the API names in prod', () => {
    expect(
      forwardCookieHeader(
        '__Host-mp_sid=abc; __Host-mp_pkce=xyz; other=1',
        true,
      ),
    ).toBe('mp_sid=abc; mp_pkce=xyz')
  })

  it('returns empty string for no cookies', () => {
    expect(forwardCookieHeader(undefined, false)).toBe('')
    expect(forwardCookieHeader('', false)).toBe('')
  })
})

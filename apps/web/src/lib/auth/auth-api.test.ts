import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMe, hasRole } from './auth-api'
import type { Me } from './auth-api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchMe', () => {
  it('returns null when unauthenticated (401)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    )

    expect(await fetchMe()).toBeNull()
  })

  it('returns the identity on 200', async () => {
    const me: Me = { id: 1, subject: 'sub-1', email: 'e@x.y', roles: ['User'] }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(me), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    expect(await fetchMe()).toEqual(me)
  })

  it('throws on a non-401 error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    )

    await expect(fetchMe()).rejects.toThrow()
  })
})

describe('hasRole', () => {
  it('checks membership', () => {
    const me: Me = { id: 1, subject: 's', roles: ['Admin', 'User'] }
    expect(hasRole(me, 'Admin')).toBe(true)
    expect(hasRole(me, 'Nope')).toBe(false)
  })
})

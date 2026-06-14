// @vitest-environment node
import { isRedirect } from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Me } from './api-loaders'
import {
  hasRole,
  loadIotEntities,
  loadMe,
  loadPlugins,
  loadSystemStatus,
  settle,
} from './api-loaders'

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('loadMe', () => {
  it('fetches /api/me and returns the identity', async () => {
    const me: Me = { id: 1, subject: 'sub', email: 'e@x.y', roles: ['User'] }
    const fetchImpl = vi.fn().mockResolvedValue(ok(me))

    expect(await loadMe(fetchImpl)).toEqual(me)
    expect(fetchImpl).toHaveBeenCalledWith('http://core-api:8080/api/me')
  })

  it('returns null on 401 (let the guard redirect)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }))
    expect(await loadMe(fetchImpl)).toBeNull()
  })

  it('throws on a non-401 error', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 }))
    await expect(loadMe(fetchImpl)).rejects.toThrow()
  })
})

describe('protected loaders', () => {
  it('loadPlugins returns the manifest list', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok([{ id: 'system' }]))
    await expect(loadPlugins(fetchImpl)).resolves.toEqual([{ id: 'system' }])
    expect(fetchImpl).toHaveBeenCalledWith('http://core-api:8080/api/plugins')
  })

  it('loadSystemStatus + loadIotEntities hit their endpoints', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(ok([])))
    await loadSystemStatus(fetchImpl)
    await loadIotEntities(fetchImpl)
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'http://core-api:8080/api/system/status',
    )
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'http://core-api:8080/api/iot/entities',
    )
  })

  it('throws a redirect (to the login proxy) on 401', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }))
    try {
      await loadPlugins(fetchImpl)
      throw new Error('expected a redirect')
    } catch (error) {
      expect(isRedirect(error)).toBe(true)
    }
  })

  it('throws a plain error on other failures (e.g. IoT 502)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 502 }))
    await expect(loadIotEntities(fetchImpl)).rejects.toThrow(/502/)
  })
})

describe('settle', () => {
  it('wraps a resolved value as data', async () => {
    expect(await settle(Promise.resolve(42))).toEqual({ data: 42 })
  })

  it('turns a plain rejection into a degraded marker', async () => {
    expect(await settle(Promise.reject(new Error('502')))).toEqual({
      error: true,
    })
  })

  it('re-throws auth redirects instead of swallowing them', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }))
    try {
      await settle(loadPlugins(fetchImpl))
      throw new Error('expected the redirect to propagate')
    } catch (error) {
      expect(isRedirect(error)).toBe(true)
    }
  })
})

describe('hasRole', () => {
  it('checks role membership', () => {
    const me: Me = { id: 1, subject: 's', roles: ['Admin', 'User'] }
    expect(hasRole(me, 'Admin')).toBe(true)
    expect(hasRole(me, 'Nope')).toBe(false)
  })
})

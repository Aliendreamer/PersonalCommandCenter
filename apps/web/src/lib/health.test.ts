import { describe, expect, it } from 'vitest'

import { deriveHealth, healthColor, healthCount } from './health'

describe('deriveHealth', () => {
  it('is down when the source errored', () => {
    expect(deriveHealth({ error: true })).toBe('down')
  })

  it('is ok when data loaded and no degraded predicate', () => {
    expect(deriveHealth({ data: { items: [1] } })).toBe('ok')
  })

  it('is degraded when loaded but the predicate flags it', () => {
    expect(
      deriveHealth({ data: { items: [] } }, (d) => d.items.length === 0),
    ).toBe('degraded')
  })

  it('is ok for a valid zero-activity result (predicate returns false)', () => {
    // A real but empty week is healthy, not degraded.
    expect(deriveHealth({ data: { weekSeconds: 0 } }, () => false)).toBe('ok')
  })
})

describe('healthColor', () => {
  it('maps each health to a Mantine color', () => {
    expect(healthColor('ok')).toBe('green')
    expect(healthColor('degraded')).toBe('yellow')
    expect(healthColor('down')).toBe('red')
  })
})

describe('healthCount', () => {
  it('counts only ok healths', () => {
    expect(healthCount(['ok', 'ok', 'down', 'degraded'])).toEqual({
      ok: 2,
      total: 4,
    })
  })
})

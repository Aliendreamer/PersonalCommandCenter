import { describe, expect, it } from 'vitest'
import { safeHref } from './safe-href'

describe('safeHref', () => {
  it('passes through http and https', () => {
    expect(safeHref('https://e.test/1')).toBe('https://e.test/1')
    expect(safeHref('http://e.test/1')).toBe('http://e.test/1')
  })

  it('blocks javascript:/data: and unparseable values', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#')
    expect(safeHref('data:text/html,<script>1</script>')).toBe('#')
    expect(safeHref('not a url')).toBe('#')
  })
})

import { describe, expect, it } from 'vitest'
import { stripHtml } from './strip-html'

describe('stripHtml', () => {
  it('drops tags and collapses whitespace', () => {
    expect(stripHtml('<b>Hello</b>\n<i>world</i>')).toBe('Hello world')
  })

  it('decodes common entities', () => {
    expect(stripHtml('Tom &amp; Jerry &#39;99')).toBe("Tom & Jerry '99")
  })

  it('neutralizes a script payload to inert text', () => {
    expect(stripHtml('<script>alert(1)</script>safe')).not.toContain('<script>')
  })
})

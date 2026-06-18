import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import { DashboardHero } from './dashboard-hero'

afterEach(cleanup)

describe('DashboardHero', () => {
  it('shows the green count over total from the healths', () => {
    render(
      <DashboardHero
        healths={['ok', 'ok', 'down', 'degraded']}
        now={new Date('2026-06-18T16:04:00')}
      />,
    )
    expect(screen.getByText(/2\s*\/\s*4/)).toBeDefined()
  })

  it('reads "all systems healthy" when every tile is ok', () => {
    render(
      <DashboardHero
        healths={['ok', 'ok']}
        now={new Date('2026-06-18T16:04:00')}
      />,
    )
    expect(screen.getByText(/all systems healthy/i)).toBeDefined()
  })

  it('greets by time of day', () => {
    render(
      <DashboardHero healths={['ok']} now={new Date('2026-06-18T16:04:00')} />,
    )
    expect(screen.getByText(/good afternoon/i)).toBeDefined()
  })
})

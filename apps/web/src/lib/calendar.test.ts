import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@pcc/contracts'
import { upcomingEvents } from './calendar'

function ev(start: string, uid = start): CalendarEvent {
  return { uid, title: `event ${uid}`, start, end: start, allDay: false }
}

describe('upcomingEvents', () => {
  const now = new Date('2026-06-21T12:00:00')

  it('keeps today + future, drops the past, sorted ascending', () => {
    const past = ev('2026-06-20T10:00:00')
    const earlierToday = ev('2026-06-21T08:00:00') // before `now` but same day → kept
    const future = ev('2026-07-02T09:00:00')

    const result = upcomingEvents([future, past, earlierToday], now)

    expect(result.map((e) => e.uid)).toEqual([earlierToday.uid, future.uid])
  })

  it('returns an empty list when nothing is upcoming', () => {
    expect(upcomingEvents([ev('2026-01-01T00:00:00')], now)).toEqual([])
  })
})
